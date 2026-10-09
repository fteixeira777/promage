
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIProjectOpinion = async (projectSummary: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Com base neste resumo do projeto de arquitetura: "${projectSummary}", fornece uma breve opinião estratégica sobre os próximos passos, riscos potenciais e sugestões de otimização documental. Responde em Português de Portugal.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "Não foi possível obter a opinião da IA no momento.";
  }
};
