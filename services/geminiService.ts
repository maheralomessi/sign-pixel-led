
import { GoogleGenAI } from "@google/genai";

/**
 * Analyzes the LED design for manufacturing issues using AI
 */
export const analyzeDesignWithAI = async (imageB64: string, params: any) => {
  // Always initialize with process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using gemini-3-pro-preview for complex reasoning tasks like geometric technical review
  const model = "gemini-3-pro-preview";

  const prompt = `
    Analyze this signage image for manufacturing.
    Target Canvas Size: ${params.canvasWidthCm}x${params.canvasHeightCm} cm.
    LED Diameter: ${params.ledDiameterMm} mm.
    Spacing: ${params.ledSpacingMm} mm.
    
    Give a brief technical review of whether the LED spacing is appropriate for the complexity of the shape. 
    Point out potential issues with tight curves where LEDs might overlap.
    Keep the response concise and in Arabic.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { 
            inlineData: { 
              mimeType: "image/png", 
              data: imageB64.split(',')[1] 
            } 
          },
          { text: prompt }
        ]
      }
    });
    // Use .text property to extract output
    return response.text;
  } catch (err) {
    console.error("Gemini Error:", err);
    return "حدث خطأ أثناء تحليل الذكاء الاصطناعي.";
  }
};
