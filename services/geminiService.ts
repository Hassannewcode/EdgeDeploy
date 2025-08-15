
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const explainCode = async (code: string, fileName: string): Promise<string> => {
  if (!API_KEY) {
    return "AI features are disabled. Please configure your Gemini API key.";
  }
  try {
    const prompt = `
      You are an expert code reviewer. Explain the following code from the file named "${fileName}".
      Be concise and clear. Focus on the code's primary purpose, its inputs/props, and what it renders or returns.
      Use markdown for formatting.

      \`\`\`
      ${code}
      \`\`\`
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response.text;
  } catch (error) {
    console.error("Error explaining code with Gemini:", error);
    if (error instanceof Error) {
        return `An error occurred while analyzing the code: ${error.message}`;
    }
    return "An unknown error occurred while analyzing the code.";
  }
};
