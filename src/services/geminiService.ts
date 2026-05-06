import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface MarketInsight {
  summary: string;
  opportunities: string[];
  risks: string[];
  predictedTrend: 'up' | 'down' | 'neutral';
}

export async function getAIInsight(marketData: any): Promise<MarketInsight | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this mobile app market data and provide strategic insights: ${JSON.stringify(marketData)}`,
      config: {
        systemInstruction: "You are a top-tier mobile market analyst. Provide data-driven summaries of growth, risks, and trends.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
            risks: { type: Type.ARRAY, items: { type: Type.STRING } },
            predictedTrend: { type: Type.STRING, enum: ["up", "down", "neutral"] }
          },
          required: ["summary", "opportunities", "risks", "predictedTrend"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as MarketInsight;
  } catch (error) {
    console.error("Gemini Error", error);
    return null;
  }
}
