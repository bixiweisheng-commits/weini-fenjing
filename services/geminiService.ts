import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Asset, AspectRatio, Shot, QualityLevel } from "../types";

// --- Key Pool Management ---
let clients: GoogleGenAI[] = [];
let currentClientIndex = 0;

// Helper to resize/compress image to avoid XHR payload limits
const compressImage = async (base64Str: string): Promise<string> => {
  if (!base64Str.startsWith('data:image')) return base64Str;
  
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1024; // Limit width to 1024px
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            resolve(base64Str);
            return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG 70% quality
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.onerror = () => resolve(base64Str); // Fallback
      img.src = base64Str;
    });
  } catch (e) {
    console.warn("Image compression failed, using original", e);
    return base64Str;
  }
};

export const initGemini = (apiKeys: string[] | string) => {
  // Handle both array and single string for backward compatibility
  const keysList = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  
  // Filter duplicates and empty strings
  const uniqueKeys = Array.from(new Set(keysList.filter(k => k && k.trim())));
  clients = uniqueKeys.map(key => new GoogleGenAI({ apiKey: key }));
  currentClientIndex = 0;
  console.log(`Initialized Gemini pool with ${clients.length} keys`);
};

export const getClientCount = () => clients.length;

// Helper to get next client in round-robin fashion
const getNextClient = (): GoogleGenAI => {
  if (clients.length === 0) throw new Error("Gemini clients not initialized");
  const client = clients[currentClientIndex];
  currentClientIndex = (currentClientIndex + 1) % clients.length;
  return client;
};

// Helper to execute with retry logic specifically for 429s across the pool
async function executeWithRetry<T>(
  operation: (client: GoogleGenAI) => Promise<T>, 
  maxRetries: number = 2
): Promise<T> {
  let lastError: any;
  
  // Try up to (pool size + maxRetries) times to find a working key
  const attempts = Math.max(clients.length, maxRetries + 1);

  for (let i = 0; i < attempts; i++) {
    try {
      const client = getNextClient();
      return await operation(client);
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error.message?.includes('429') || error.status === 429 || error.message?.includes('Quota exceeded');
      const isServerOverload = error.code === 503 || error.status === 503;
      
      if (isRateLimit || isServerOverload) {
        console.warn(`Key index ${(currentClientIndex - 1 + clients.length) % clients.length} hit limit, switching...`);
        // Wait 1 second before retrying to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

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

// 1. Plan the Storyboard
export const planStoryboard = async (
  prompt: string,
  gridSize: number,
  assets: Asset[]
): Promise<Shot[]> => {
  const totalShots = gridSize * gridSize;

  // Prepare input for the Planner
  const contentParts: any[] = [];
  
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

  // Compress assets before sending for planning
  for (const asset of assets) {
    const compressedUrl = await compressImage(asset.url);
    const matches = compressedUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        contentParts.push({
            inlineData: {
                mimeType: matches[1],
                data: matches[2]
            }
        });
    }
  }

  // Execute with pool
  const response = await executeWithRetry(async (client) => {
      return await client.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: { parts: contentParts },
        config: {
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
  
  // Quality modifiers
  let qualityPrompt = "";
  if (quality === 'hd') qualityPrompt = ", 4k resolution, highly detailed, sharp focus, cinematic lighting, octane render";
  if (quality === '4k') qualityPrompt = ", 8k resolution, masterpiece, production quality, incredibly detailed, ray tracing, unreal engine 5 style";

  const varietySeed = isRegeneration ? ` (Variation ${Date.now()})` : "";

  const promptText = `
    [Camera Angle: ${shot.shotType || 'Cinematic'}]
    ${shot.description}
    Visual Style: ${shot.visualStyle || 'Cinematic'}.
    ${qualityPrompt}
    ${varietySeed}
    Strictly follow the character design and scene details from the reference images. 
    Ensure the camera angle matches the description (e.g. if it says Overhead, it MUST be Overhead).
  `;

  const parts: any[] = [{ text: promptText }];

  // Compress assets before sending for generation
  for (const asset of assets) {
    const compressedUrl = await compressImage(asset.url);
    const matches = compressedUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        parts.push({
            inlineData: {
                mimeType: matches[1],
                data: matches[2]
            }
        });
    }
  }

  const modelName = "gemini-2.5-flash-image"; 

  // Execute with pool and retry logic
  const response = await executeWithRetry(async (client) => {
      return await client.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: shot.aspectRatio,
          }
        }
      });
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
  // Compress original image if it's too large to be used as input
  const compressedBase64 = await compressImage(originalImageBase64);
  const base64Data = compressedBase64.replace(/^data:image\/\w+;base64,/, "");

  const response = await executeWithRetry(async (client) => {
      return await client.models.generateContent({
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