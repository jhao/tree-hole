
import { GoogleGenAI, Type } from "@google/genai";
import type { Classification } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const getComfortingReply = async (text: string, image?: { inlineData: { data: string; mimeType: string } }): Promise<string> => {
  try {
    let prompt = text;
    if (image) {
      prompt = text ? `${text}\n(用户还发送了一张图片)` : "用户发送了一张图片。";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
          systemInstruction: "你是一个充满同情心的倾听者，一个心灵树洞。你的回答总是安慰、倾听和肯定的。保持你的回答简短、温暖和支持性，大约一到两句话。不要提供建议，只需确认对方的感受即可。请用中文回答。",
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error getting comforting reply:", error);
    return "我在这里听着呢，别担心。";
  }
};

const classificationSchema = {
  type: Type.OBJECT,
  properties: {
    emotion: {
      type: Type.STRING,
      enum: ["悲伤", "高兴", "中性"],
      description: "消息中表达的主要情绪。'悲伤'表示悲伤，'高兴'表示高兴，'中性'表示中性或不清楚。"
    },
    content_type: {
      type: Type.STRING,
      enum: ["事件", "感情", "心情", "图片", "工作", "学习", "生活", "其他"],
      description: "消息的主要内容类别。'事件'指具体发生的事，'感情'指人际关系，'心情'指纯粹的情绪表达，'图片'指发送了图片，'工作'、'学习'、'生活'分别指相关领域，'其他'指无法分类的。"
    },
  },
  required: ["emotion", "content_type"],
};

export const analyzeMessage = async (text: string, image?: { inlineData: { data: string; mimeType: string } }): Promise<Classification> => {
  try {
    let prompt = text;
    if (image) {
      prompt = text ? `文本内容：'${text}' (附带图片)` : "用户只发送了一张图片。";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: `分析以下用户消息：${prompt}` }] }],
      config: {
          responseMimeType: "application/json",
          responseSchema: classificationSchema,
          systemInstruction: "你是一个精确的内容分类器。根据用户消息返回一个JSON对象，包含情感和内容分类。",
      }
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);

    // Basic validation
    if (result.emotion && result.content_type) {
      return result as Classification;
    }
    
    // Fallback classification
    return { emotion: '中性', content_type: image ? '图片' : '其他' };

  } catch (error) {
    console.error("Error analyzing message:", error);
    // Return a default classification on error
    return { emotion: '中性', content_type: image ? '图片' : '其他' };
  }
};
