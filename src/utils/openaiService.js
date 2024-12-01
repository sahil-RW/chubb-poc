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
1. Claim Description: Extract and provide the claim description from the whole PDF text extracted using OCR. 
2. AI Interpretation: Identify and describe the specific details of the accident scene, including the nature of the collision, visible damages, and any relevant observations.
3. Condition: Assess the condition of the vehicles, objects, or individuals involved in the accident, including visible damage and any potential injuries.
4. Comparison: Compare the details extracted from the accident scene with the claim description from the PDF. 
   - If the claim description matches the accident scene details, indicate "Pass".
   - If the claim description does not match the accident scene details, indicate "Fail" and provide specific reasons for the mismatch.
5. Result: Summarize whether the accident scene matches the claim description (Pass/Fail), and if it fails, outline the reasons for the discrepancy.
6. Reason: Reason for which it is pass or fail

Be precise, objective, and focus on extracting key information that can be used for insurance claim verification. Ensure that the comparison is detailed and that the result is logically derived from the analysis.
`;

  const updatedImages = await Promise.all(
    images.map(async (image) => {
      try {
        const base64Image = await getBase64(image.file);
        const claim = image.claimDescription || "No claim description provided";

        const extractClaimDescriptionPrompt = `
        You are an AI document processor.
        Your task is to extract the claim description from the provided PDF text. The claim description should be as detailed and precise as possible, focusing on the key points relevant to insurance claims.
        
        Provided PDF text:
        ${claim}
        
        Return only the extracted claim description.
        `;

         // Step 1: Extract the claim description from the PDF text
         const extractClaimDescriptionMessages = [
          new SystemMessage(`You are an AI document processor. Your task is to extract the claim description from the provided PDF text. Return only the extracted claim description.`),
          new HumanMessage({ content: claim }),
        ];

        const claimDescriptionResponse = await model.invoke(extractClaimDescriptionMessages);
        const claimDes = sanitizeResponse(claimDescriptionResponse.content.toString());

        const messages = [
          new SystemMessage(systemPrompt),
          new HumanMessage({
            content: `
Extract relevant insurance Claim Description from the whole pdf text and use for comparision:
${claimDes}

Analyze the following accident scene image:
![image](data:image/jpeg;base64,${base64Image})

Provide a one-line summary response with:
1. Claim Information
2. AI Interpretation
3. Result (Pass/Fail based on acccident details match with claim description match extracted from the pdf text just give one word)
4. Reason
5. Done
            `,
          }),
        ];

        const analysisResponse = await model.invoke(messages);
        const analysisText = sanitizeResponse(analysisResponse.content.toString());

        // Detailed extraction of analysis components
        const extractSection = (sectionName) => {
          const sectionMap = {
            'Claim Information': /1\.\s*Claim Information:?\s*(?:-\s*)?([\s\S]*?)(?=\n2\.|\n#|\Z)/,
            'AI Interpretation': /2\.\s*AI Interpretation:?\s*([\s\S]*?)(?=\n3\.|\n#|\Z)/,
            'Result': /3\.\s*Result:?\s*([\s\S]*?)(?=\n4\.|\n#|\Z)/,
            'Reason': /4\.\s*Reason:?\s*([\s\S]*?)(?=\n5\.|\n#|\Z)/
          };
        
          const regex = sectionMap[sectionName];
          if (!regex) return "Section not found";
        
          const match = analysisText.match(regex);
          return match ? match[1].trim() : "Not analyzed";
        };

        const claimInformation = extractSection('Claim Information');
        const aiInterpretation = extractSection('AI Interpretation');
        const result = extractSection('Result');
        const reason = extractSection('Reason');

        return {
          ...image,
          analysisStatus: "completed",
          claimInformation,
          aiInterpretation,
          result,
          reason
        };
      } catch (error) {
        console.error("Error analyzing image and claim:", error);
        return {
          ...image,
          analysisStatus: "error",
          claimInformation: "Analysis Error",
          aiInterpretation: "Analysis Error",
          result: "Analysis Error",
          reason: "Analysis Error"
        };
      }
    })
  );

  return updatedImages;
};