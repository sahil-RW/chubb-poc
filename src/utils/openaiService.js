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

export const analyzeMultipleImages = async (images) => {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    openAIApiKey: OPENAI_API_KEY,
    maxTokens: 500,
    temperature: 0,
  });

  const systemPrompt = `
You are an expert accident scene analyzer. Analyze each image and provide the following details:
- Vehicles Involved: Mention the number and types of vehicles visible.
- Accident Details: Describe the nature of the accident or damage (e.g., front-end collision, side-swipe, rollover, minor scratches, severe structural damage, etc.).
- Surroundings: Note any visible environmental or contextual elements (e.g., urban road, highway, intersection, traffic signals, weather conditions, or nearby objects like guardrails, trees, etc.).
- Condition: Assess the apparent condition of vehicles, surroundings, or other items in the scene (e.g., drivable, severe damage, visible hazards, etc.).
- Overall assesment: Provide an overall evaluation, including potential repair cost estimates if possible, and the severity of the incident (e.g., minor, moderate, severe).

Provide concise, factual information. If details are unclear, use 'NA'.
  `;

  const extractField = (text, field) => {
    const regex = new RegExp(`${field}:(.+?)(?=\\n|$)`, "i");
    const match = text.match(regex);
    return match?.[1]?.trim() || "NA";
  };
  
  const updatedImages = await Promise.all(
    images.map(async (image) => {
      try {
        const base64Image = await getBase64(image.file);
  
        const messages = [
          new SystemMessage(systemPrompt),
          new HumanMessage({
            content: `Analyze the following accident scene image:\n![image](data:image/jpeg;base64,${base64Image})`,
          }),
        ];
  
        const response = await model.invoke(messages);
        const analysisText = sanitizeResponse(response.content.toString());
  
        console.log("AI Response:", analysisText); // Debugging log
  
        // Extract fields using the improved parsing logic
        return {
          ...image,
          vehiclesInvolved: extractField(analysisText, "Vehicles Involved"),
          accidentDetails: extractField(analysisText, "Accident Details"),
          surroundings: extractField(analysisText, "Surroundings"),
          condition: extractField(analysisText, "Condition"),
          overallAssesment: extractField(analysisText, "Overall Assessment"),
          analysisStatus: "completed",
        };
      } catch (error) {
        console.error("Error analyzing image:", error);
        return {
          ...image,
          vehiclesInvolved: "Analysis Error",
          accidentDetails: "Analysis Error",
          surroundings: "Analysis Error",
          condition: "Analysis Error",
          overallAssesment: "Analysis Error",
          analysisStatus: "error",
        };
      }
    })
  ); 

  return updatedImages;
};
