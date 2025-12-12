import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Asset, AspectRatio, Shot, QualityLevel } from "../types";

let client: GoogleGenAI | null = null;

export const initGemini = (apiKey: string) => {
  client = new GoogleGenAI({ apiKey });
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const tempClient = new GoogleGenAI({ apiKey });
    await tempClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'ping',
    });
    return true;
  } catch (e) {
    console.error("API Key validation failed", e);
    return false;
  }
};

interface PlanResponse {
  shots: { description: string; visualStyle: string; shotType: string }[];
}

// 1. Plan the Storyboard using Thinking Model
export const planStoryboard = async (
  prompt: string,
  gridSize: number,
  assets: Asset[]
): Promise<Shot[]> => {
  if (!client) throw new Error("Gemini client not initialized");

  const totalShots = gridSize * gridSize;

  // Prepare input for the Planner so it can "see" the style
  const contentParts: any[] = [];
  
  // Add text prompt first
  contentParts.push({
    text: `
      你是一位屡获殊荣的电影摄影指导（DP）和分镜大师。请根据用户需求，设计一个包含 ${totalShots} 个镜头的分镜脚本。

      用户需求: "${prompt}"

      【绝对核心指令：最大化镜头多样性】
      严禁生成一连串相似的镜头。每一个镜头必须在“景别”和“角度”上与前一个显著不同。
      
      请强制从以下列表中循环选择景别，确保包含至少 5 种不同类型：
      - Extreme Wide Shot (EWS) - 极远景（交代环境）
      - Wide Shot (WS) - 全景
      - Medium Shot (MS) - 中景
      - Close Up (CU) - 特写
      - Extreme Close Up (ECU) - 大特写（细节，眼睛，物体）
      - Over the Shoulder (OTS) - 过肩镜头
      - Low Angle - 仰拍（强调力量感）
      - High Angle / Overhead - 俯拍/顶视（上帝视角）
      - Dutch Angle - 荷兰角（倾斜，不安）

      【叙事节奏】
      像电影预告片一样安排镜头：从环境引入 -> 角色登场 -> 局部特写 -> 动作冲突 -> 反应镜头 -> 独特视角。不要只给“平视的中景”。

      【风格与一致性】
      1. 分析参考图的美术风格，所有镜头必须保持统一的色调和质感。
      2. 角色一致性：必须在每个镜头描述中重复人物的具体特征（如：穿着破旧棕色皮夹克的胡茬大叔），哪怕是远景也要提及。

      输出 JSON 格式，包含 'shots' 列表。每个 shot 需包含：
      - description: 极其详细的画面生成提示词。必须包含具体的摄像机指令（如：'Camera placed low looking up', 'Macro lens focus on eyes'）。
      - visualStyle: 风格关键词（如：Cyberpunk, Noir, Soft lighting）。
      - shotType: 具体的景别术语（如：Low Angle CU）。
    `
  });

  // Add reference images to the planner context
  assets.forEach(asset => {
    const matches = asset.url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        contentParts.push({
            inlineData: {
                mimeType: matches[1],
                data: matches[2]
            }
        });
    }
  });

  const response = await client.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: contentParts },
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          shots: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                visualStyle: { type: Type.STRING },
                shotType: { type: Type.STRING }
              },
              required: ["description", "visualStyle", "shotType"]
            }
          }
        },
        required: ["shots"]
      }
    }
  });

  if (!response.text) throw new Error("No plan generated");
  
  try {
    const data = JSON.parse(response.text) as PlanResponse;
    let plannedShots = data.shots.slice(0, totalShots);
    
    // Fallback if model generates fewer
    if (plannedShots.length < totalShots) {
        const diff = totalShots - plannedShots.length;
        for (let i = 0; i < diff; i++) {
             plannedShots.push({
                 description: "Atmospheric detail shot consistent with the scene.",
                 visualStyle: plannedShots[0]?.visualStyle || "Cinematic",
                 shotType: "Insert Shot"
             });
        }
    }

    // Return structured Shot objects (without IDs yet)
    return plannedShots.map(s => ({
        id: '', // to be filled by caller
        description: s.description,
        visualStyle: s.visualStyle,
        shotType: s.shotType,
        aspectRatio: '16:9', // placeholder
        isGenerating: true
    }));

  } catch (e) {
    console.error("Failed to parse plan", e);
    throw new Error("Failed to parse storyboard plan");
  }
};

// 2. Generate Individual Shot
export const generateShotImage = async (
  shot: Shot,
  assets: Asset[],
  quality: QualityLevel = 'standard',
  isRegeneration: boolean = false
): Promise<string> => {
  if (!client) throw new Error("Gemini client not initialized");

  // Quality modifiers
  let qualityPrompt = "";
  if (quality === 'hd') qualityPrompt = ", 4k resolution, highly detailed, sharp focus, cinematic lighting, octane render";
  if (quality === '4k') qualityPrompt = ", 8k resolution, masterpiece, production quality, incredibly detailed, ray tracing, unreal engine 5 style";

  // Variety modifier for regeneration
  const varietySeed = isRegeneration ? ` (Variation ${Date.now()})` : "";

  // Construct Prompt
  const promptText = `
    [Camera Angle: ${shot.shotType || 'Cinematic'}]
    ${shot.description}
    Visual Style: ${shot.visualStyle || 'Cinematic'}.
    ${qualityPrompt}
    ${varietySeed}
    Strictly follow the character design and scene details from the reference images. 
    Ensure the camera angle matches the description (e.g. if it says Overhead, it MUST be Overhead).
  `;

  // Prepare content parts
  const parts: any[] = [{ text: promptText }];

  // Add all assets as reference images
  assets.forEach(asset => {
    const matches = asset.url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        parts.push({
            inlineData: {
                mimeType: matches[1],
                data: matches[2]
            }
        });
    }
  });

  // Decide model based on quality/need
  // We stick to 2.5 flash image for reliability as requested, but enhance prompt for quality
  const modelName = "gemini-2.5-flash-image"; 

  const response = await client.models.generateContent({
    model: modelName,
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: shot.aspectRatio,
      }
    }
  });

  const contentParts = response.candidates?.[0]?.content?.parts;
  if (!contentParts) throw new Error("No image generated");

  for (const part of contentParts) {
    if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image data found in response");
};

// 3. Edit Shot
export const editShotImage = async (
  originalImageBase64: string,
  instruction: string
): Promise<string> => {
  if (!client) throw new Error("Gemini client not initialized");

  const base64Data = originalImageBase64.replace(/^data:image\/\w+;base64,/, "");

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
            inlineData: {
                mimeType: "image/png",
                data: base64Data
            }
        },
        {
          text: instruction,
        }
      ],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No edited image generated");

  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image data found");
};