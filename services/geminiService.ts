import { GoogleGenAI, Type } from "@google/genai";
import { AiAnalysisResult } from "../types";

// Initialize Gemini Client
// NOTE: In a real deployment, you might want to proxy this through your Cloudflare Worker to hide the key,
// but for a personal app with a password, using the env var directly in the client code is acceptable if the host is secure.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeContent = async (content: string): Promise<AiAnalysisResult> => {
  try {
    const modelId = "gemini-2.5-flash";
    
    // Explicitly request Chinese output in the prompt
    const prompt = `
      请分析以下内容（可能是 URL 或纯文本）。
      请务必使用 **简体中文** 输出结果。
      
      要求：
      1. title: 一个简明的中文标题。
      2. summary: 一段中文摘要（不超过2句话）。
      3. tags: 3-5 个相关的中文标签。
      4. type: 判断类型，只能是 'link' (如果是网址), 'note' (如果是普通文本), 'snippet' (如果是代码片段)。
      
      内容: "${content.substring(0, 5000)}"
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            tags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            type: { type: Type.STRING, enum: ["link", "note", "snippet"] }
          },
          required: ["title", "summary", "tags", "type"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AiAnalysisResult;

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    // Fallback if AI fails
    return {
      title: "未命名条目",
      summary: "AI 分析失败，请手动编辑。",
      tags: ["未分类"],
      type: content.startsWith("http") ? "link" : "note"
    };
  }
};