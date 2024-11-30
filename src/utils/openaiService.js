import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

const getBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = (error) => reject(error);
  });
};

const sanitizeResponse = (text) => {
  return text.replace(/[*#]/g, ""); // Remove */# symbols globally from the text
};

export const analyzeMultipleImagesAndClaims = async (images) => {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    openAIApiKey: OPENAI_API_KEY,
    maxTokens: 1000,
    temperature: 0,
  });

  const systemPrompt = `
You are an AI document processor and accident scene analyzer.
Your task is to provide a detailed analysis of the accident scene and extract the claim description from the provided PDF text.

Analysis Requirements:
1. Accident Details: Identify and describe the specific details of the accident scene, including the nature of the collision, visible damages, and any relevant observations.
2. Surroundings: Describe the environmental and contextual elements around the accident, such as the location, traffic conditions, and any nearby structures or landmarks.
3. Condition: Assess the condition of the vehicles, objects, or individuals involved in the accident, including visible damage and any potential injuries.
4. Overall Assessment: Provide a comprehensive summary of the incident, including likely causes, severity, and any other significant factors.
5. Claim Description: Extract and provide the claim description from the whole PDF text extracted using OCR.
6. Comparison: Compare the details extracted from the accident scene with the claim description from the PDF. 
   - If the claim description matches the accident scene details, indicate "Pass".
   - If the claim description does not match the accident scene details, indicate "Fail" and provide specific reasons for the mismatch.
7. Result: Summarize whether the accident scene matches the claim description (Pass/Fail), and if it fails, outline the reasons for the discrepancy.

Be precise, objective, and focus on extracting key information that can be used for insurance claim verification. Ensure that the comparison is detailed and that the result is logically derived from the analysis.
`;

  const updatedImages = await Promise.all(
    images.map(async (image) => {
      try {
        const base64Image = await getBase64(image.file);
        const claim = image.claimDescription || "No claim description provided";

        const messages = [
          new SystemMessage(systemPrompt),
          new HumanMessage({
            content: `
Extract Claim Description from the whole pdf text and use for comparision:
${claim}

Analyze the following accident scene image:
![image](data:image/jpeg;base64,${base64Image})

Provide a one-line summary response with:
1. Accident Details
2. Surroundings
3. Condition
4. Overall Assessment
5. Result (Pass/Fail based on acccident details match with claim description match extracted from the pdf text just give one word)
6. Claim Description
            `,
          }),
        ];

        const analysisResponse = await model.invoke(messages);
        const analysisText = sanitizeResponse(analysisResponse.content.toString());

        console.log(analysisText)
        // Detailed extraction of analysis components
        const extractSection = (sectionName) => {
          const sectionMap = {
            'Accident Details': /1\.\s*Accident Details:?\s*(?:-\s*)?([\s\S]*?)(?=\n2\.|\n#|\Z)/,
            'Surroundings': /2\.\s*Surroundings:?\s*([\s\S]*?)(?=\n3\.|\n#|\Z)/,
            'Condition': /3\.\s*Condition:?\s*([\s\S]*?)(?=\n4\.|\n#|\Z)/,
            'Overall Assessment': /4\.\s*Overall Assessment:?\s*([\s\S]*?)(?=\n5\.|\n#|\Z)/,
            'Result': /5\.\s*Result:?\s*([\s\S]*?)(?=\n6\.|\n#|\Z)/
          };
        
          const regex = sectionMap[sectionName];
          if (!regex) return "Section not found";
        
          const match = analysisText.match(regex);
          return match ? match[1].trim() : "Not analyzed";
        };

        const accidentDetails = extractSection('Accident Details');
        const surroundings = extractSection('Surroundings');
        const condition = extractSection('Condition');
        const overallAssesment = extractSection('Overall Assessment');
        const result = extractSection('Result');
        console.log(result)

        return {
          ...image,
          analysisStatus: "completed",
          accidentDetails,
          surroundings,
          condition,
          overallAssesment,
          result
        };
      } catch (error) {
        console.error("Error analyzing image and claim:", error);
        return {
          ...image,
          analysisStatus: "error",
          accidentDetails: "Analysis Error",
          surroundings: "Analysis Error",
          condition: "Analysis Error",
          overallAssesment: "Analysis Error",
          result: "Analysis Error"
        };
      }
    })
  );

  return updatedImages;
};