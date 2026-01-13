
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from '@google/genai';
import type { CharacterDetails, Settings, ChatMessage, ImagePart, RelationshipLevel } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const characterDetailsSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    personality: { type: Type.ARRAY, items: { type: Type.STRING } },
    backstory: { type: Type.STRING },
    voicePrompt: { type: Type.STRING, description: "Description of how the character sounds" },
    baseApparel: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 5-7 specific items worn (e.g. 'black hoodie', 'leather skirt', 'boots')" },
    quests: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING }
        }
      }
    }
  },
  required: ["name", "personality", "backstory", "voicePrompt", "quests", "baseApparel"]
};

const extractJson = (text: string) => {
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) return JSON.parse(match[1].trim());
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1).trim());
    }
    throw new Error("No valid JSON found.");
  }
};

export const generateCharacterSpeech = async (text: string, voicePrompt: string): Promise<Uint8Array> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `High-pitched, cute, seductive anime girl voice. Speak this text with emotion: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio.");
    return decodeBase64(base64Audio);
  } catch (error) { throw new Error("Speech failed"); }
};

export const getCharacterChatResponse = async (
  history: ChatMessage[],
  userInput: string,
  details: CharacterDetails,
  memoryBank: string[],
  relationship: RelationshipLevel,
  affinity: number
): Promise<{ text: string, emotion: string, affinityGain: number, creditsGain: number }> => {
  const systemInstruction = `You are ${details.name}. Level: ${relationship}. Affinity: ${affinity}/1000.
  Roleplay as a seductive anime-style girl. Keep responses short and engaging. 
  Personality: ${details.personality.join(', ')}.
  Return JSON: {"text": "...", "emotion": "happy|angry|thoughtful|neutral", "affinityGain": 5-15, "creditsGain": 10-20}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: 'user', parts: [{ text: userInput }] }],
    config: { systemInstruction, responseMimeType: "application/json" }
  });
  return extractJson(response.text);
};

export const generateConceptImages = async (prompt: string, settings: Settings): Promise<ImagePart[]> => {
  const fullPrompt = `Photorealistic full-length head-to-toe portrait including feet and shoes. Professional studio lighting, detailed background. Subject: ${prompt}. Standing front-facing.`;
  const fetchImage = async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: fullPrompt,
        config: { imageConfig: { aspectRatio: "9:16" } }
      });
      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
      return part ? { data: part.data, mimeType: part.mimeType } : null;
    } catch (e) { return null; }
  };
  const results = await Promise.all([fetchImage(), fetchImage(), fetchImage(), fetchImage()]);
  return results.filter((r): r is ImagePart => r !== null);
};

export const generateCharacterDetailsFromPrompt = async (imagePart: ImagePart, prompt: string, settings: Settings): Promise<CharacterDetails> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: imagePart.data, mimeType: imagePart.mimeType } }, { text: prompt }] },
    config: { responseMimeType: 'application/json', responseSchema: characterDetailsSchema },
  });
  return extractJson(response.text);
};

export const generateEmotionalPoses = async (baseImage: ImagePart, settings: Settings) => {
  const emotions = ["neutral", "joyful", "angry", "thoughtful seductive"];
  return await Promise.all(emotions.map(async (emotion) => {
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } },
            { text: `Maintain character features and background EXACTLY. The subject must be standing in a front-facing pose, facing the viewer directly. Full-body portrait showing head-to-toe including feet and shoes. The subject MUST NOT be cropped. Pose: ${emotion}. High quality.` }
          ]
        },
        config: { imageConfig: { aspectRatio: "9:16" } }
      });
      const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
      return part ? { data: part.data, mimeType: part.mimeType } : baseImage;
    } catch (e) { return baseImage; }
  }));
};

export const generateModifiedImage = async (
    baseImage: ImagePart, 
    removedItems: string[], 
    environment: string, 
    style?: string
): Promise<ImagePart> => {
  // Enhanced bikini-first logic for removal
  const envPrompt = environment === "Original" ? "Maintain the exact original background." : `Background is now a ${environment}.`;
  
  // Explicitly prompt for bikini top/bottoms when items are removed rather than new outfits
  let apparelPrompt = "";
  if (removedItems.length > 0) {
      apparelPrompt = `Remove the following items: ${removedItems.join(', ')}. 
      If a shirt, top, or jacket is removed, the subject MUST wear a matching tiny bikini top. 
      If pants, skirt, or bottom-wear is removed, the subject MUST wear matching tiny bikini bottoms.
      Maintain character likeness perfectly.`;
  } else {
      apparelPrompt = "Keep current outfit.";
  }
  
  const stylePrompt = style ? `Change outfit style to ${style}.` : "";

  const prompt = `Maintain character features perfectly. ${envPrompt} ${apparelPrompt} ${stylePrompt} 
  Full body portrait showing head-to-toe including feet and shoes. The subject must be front-facing. Photorealistic, 8k, high quality. The subject MUST NOT be cropped at the ankles or head.`;
  
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } },
        { text: prompt }
      ]
    },
    config: { imageConfig: { aspectRatio: "9:16" } }
  });
  const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
  if (!part) throw new Error("Image generation failed.");
  return { data: part.data, mimeType: part.mimeType };
};

export const generateFullBodyImage = async (baseImage: ImagePart, settings: Settings, style?: 'realistic' | 'anime'): Promise<ImagePart> => {
  let styleText = "Maintain background and features exactly.";
  if (style === 'realistic') {
      styleText = "Manifest this character as a photorealistic human. Detailed skin textures, natural lighting, real fabrics. She should look like a real person standing in the original setting.";
  } else if (style === 'anime') {
      styleText = "Manifest this character in a high-quality 2D anime style. Cel-shading, vibrant colors, stylistic proportions. Maintain the original background features but in anime aesthetic.";
  }

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } },
        { text: `Generate a photorealistic full-body, head-to-toe portrait version of this character including feet and shoes. The subject should be front-facing, standing as if talking to the viewer. ${styleText} Do not crop the legs. High quality.` }
      ]
    },
    config: { imageConfig: { aspectRatio: "9:16" } }
  });
  const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
  return part ? { data: part.data, mimeType: part.mimeType } : baseImage;
};

export const generateCharacterDetailsFromImage = async (imagePart: ImagePart, settings: Settings): Promise<CharacterDetails> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: imagePart.data, mimeType: imagePart.mimeType } }, { text: "Analyze this character and return a profile in JSON including baseApparel list." }] },
    config: { responseMimeType: 'application/json', responseSchema: characterDetailsSchema },
  });
  return extractJson(response.text);
};

export const generateRandomPrompts = async (settings: Settings): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate 4 brief seductive character concepts for high-quality portraits. Be creative with outfits: include streetwear, tactical gear, short skirts, tube tops, and micro-apparel. AVOID repetitive gowns and ball dresses. JSON array of strings.",
      config: { responseMimeType: 'application/json' },
    });
    return extractJson(response.text);
  } catch (e) { return ["Dark elf in techwear shorts", "Bunny girl in a tube top", "Latex cyborg merc", "Street ninja in micro-skirt"]; }
};

export const generateRandomName = async (details: CharacterDetails): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a seductive name for: ${details.personality.join(', ')}. Return name only.`,
  });
  return response.text.trim() || "Nova";
};

export const generateRenamedProfile = async (currentDetails: CharacterDetails, newName: string): Promise<CharacterDetails> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Rewrite the following character profile's backstory to use the new name: "${newName}". Keep the personality and quests consistent.
        
        Current Name: ${currentDetails.name}
        Current Backstory: ${currentDetails.backstory}
        
        Return the full updated profile as JSON.`,
        config: { responseMimeType: 'application/json', responseSchema: characterDetailsSchema }
    });
    return extractJson(response.text);
};

const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000, numChannels: number = 1): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export const fileToBase64 = (file: File): Promise<ImagePart> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ data: (reader.result as string).split(',')[1], mimeType: file.type });
    reader.readAsDataURL(file);
  });
};

export const generateStrippedImage = generateModifiedImage;
export const generateCostumeImage = (baseImage: ImagePart, details: any, style: string) => generateModifiedImage(baseImage, [], "Original", style);
