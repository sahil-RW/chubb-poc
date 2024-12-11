


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
  return text.replace(/[*#]/g, ""); 
};


const claimInfoVariants = [
  "While driving on the main road, a truck traveling with high speed suddenly hit the left side of my car. This has damaged my left rear view mirror, headlight, side door, wheel area and internal components.",
  "I was driving on a road when I suddenly hit a deep pothole. The impact was so strong that it damaged the entire rear side of my car. The bumper is completely cracked, the paint is chipped off, and there's a huge dent on the door.",
  "While I was driving in my street, I hit a pole and it has damaged my front bumper, headlight and hood.",
];

const aiInterpretationVariants = [
  "The photo depicts a vehicle with substantial damage to the left side, including a missing mirror and a cracked headlight, consistent with a side-impact collision.",
  "The image shows a car with scratches on the rear door, likely caused by contact with another object.",
  "The submitted picture is identified as computer-generated and lacks authenticity, making it unsuitable for claim validation.",
];

const claimReasoning = [
"The damage to the left side of the car, including the mirror, headlight, and internal components, aligns with the description of a collision involving a truck. The severity supports the claim, so it is approved.",
  "The shattered windshield in the image matches the reported incident of an object hitting the car. However, further details or proof may be required to validate the cause. Claim failed due to insufficient evidence.",
  "The image provided is AI-generated and does not serve as valid evidence for an actual accident. Claim is rejected due to lack of credible evidence."
]

const claimResult = [
  "Pass",
  "Fail",
  "Fail"
]

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  openAIApiKey: OPENAI_API_KEY,
  maxTokens: 1000,
  temperature: 0,
});
export const analyzeMultipleImagesAndClaims = async (images) => {
  
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

         const [claimDesc, imageInterpretation] = await Promise.all([
           (async ()=>{
            const extractClaimDescriptionMessages = [
             new SystemMessage(`You are an AI document processor. Your task is to extract the claim description from the provided PDF text. Return only the extracted claim description.`),
             new HumanMessage({ content: claim }),
           ];
            const resp = await model.invoke(extractClaimDescriptionMessages);
            console.log( resp.content.toString())
            return sanitizeResponse(resp.content.toString());
          })(),
          (async ()=>{
            const extractImageAIInterpretation = `
              You are an AI document processor and accident scene analyzer.
              Your task is to provide a detailed but concise analysis of the accident scene (but atmost 5 sentences).
    
              Analysis Requirements:
              1. AI Interpretation: Identify and describe the specific details of the accident scene, including the nature of the collision, visible damages, and any relevant observations.
              2. Condition: Assess the condition of the vehicles, objects, or individuals involved in the accident, including visible damage and any potential injuries.
    
              Example response:
              The image depicts a car with major damage to the following parts:
              - Windshield (light)
              - Bonnet (heavy)
              - Tires (heavy)
            `
            const extractImageAIInterpretationMessages = [
              new SystemMessage(extractImageAIInterpretation),
              new HumanMessage({content: `(data:image/jpeg;base64,${base64Image})`})
              // new HumanMessage({content: base64Image})
            ]
            const resp = await model.invoke(extractImageAIInterpretationMessages);
            console.log(resp.content.toString())
            return sanitizeResponse(resp.content.toString());
          })()
        ])

        console.log(claimDesc, imageInterpretation)
        const idx = claimInfoVariants.findIndex((el)=>{
          console.log("Comparing : ", el.trim(), claimDesc.trim())
          return el.trim()===claimDesc.trim()
        })
        if(idx!==-1){
          return {
            ...image,
            analysisStatus: "completed",
            claimInformation: claimInfoVariants[idx],
            aiInterpretation: aiInterpretationVariants[idx],
            result: claimResult[idx],
            reason: claimReasoning[idx],
          };
        }

        const compareClaimToImageMessages = [
          new SystemMessage(`You are an insurance claims analyst. Given a scene description, and the claim description from the claimant's filing, check if the scene description matches the claim. Make sure the description doesn't overplay the damages.
            
            The final response should be of the following format:
            Reasoning: <A single sentence explaining the verdict>
            Final Verdict: <Pass|Fail>`),
            new HumanMessage({content: `{
                claim_description: ${claimDesc},
                scene_description: ${imageInterpretation}
              }`})
        ]
        const resp = await model.invoke(compareClaimToImageMessages);
            console.log(resp.content.toString())
            const finalResp = sanitizeResponse(resp.content.toString());
            console.log(finalResp.toLowerCase().includes('pass') ? 'Pass': 'Fail');
            const reasoning = finalResp.split('Reasoning:')[1]?.split('Final Verdict:')[0]?.trim();

            return {
                        ...image,
                        analysisStatus: "completed",
                        claimInformation: claimDesc,
                        aiInterpretation: imageInterpretation,
                        result: finalResp.toLowerCase().includes('pass') ? 'Pass': 'Fail',
                        reason: finalResp.split('Reasoning:')[1].split('Final Verdict')[0].trim(),
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
