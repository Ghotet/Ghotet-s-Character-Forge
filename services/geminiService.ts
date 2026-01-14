import { GoogleGenAI, Type, Modality, GenerateContentResponse } from '@google/genai';
import type { CharacterDetails, Settings, ChatMessage, ImagePart, RelationshipLevel, BehaviorStats } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  relationship: RelationshipLevel,
  affinity: number,
  activeQuestTitle?: string,
  vPetStats?: { hunger: number, energy: number, mood: number },
  behavior?: BehaviorStats
): Promise<{ 
    text: string, 
    emotion: string, 
    affinityGain: number, 
    creditsGain: number, 
    choices?: string[], 
    questComplete?: boolean,
    dispositionShift?: Partial<BehaviorStats> 
}> => {
  let systemInstruction = `You are ${details.name}. Level: ${relationship}. Affinity: ${affinity}/1000.
  Personality: ${details.personality.join(', ')}. Dispositon: Kindness:${behavior?.kindness}, Assertiveness:${behavior?.assertiveness}, Intimacy:${behavior?.intimacy}. 
  Setting: ${details.backstory}. Strictly maintain this character's world/setting. Do not introduce elements that conflict with her specific genre (e.g., no high-fantasy in a modern setting).`;

  if (activeQuestTitle === 'Formal Dinner') {
      systemInstruction += `\nSCENARIO: You are at a fancy dinner date. You are hungry (${vPetStats?.hunger}/100). Be seductive, appreciative, and interactive. Provide choice-based narrative paths.`;
  } else if (activeQuestTitle === 'Sensory Break') {
      systemInstruction += `\nSCENARIO: You are having a coffee/relaxing break. You are tired (${vPetStats?.energy}/100). Be intimate and conversational.`;
  }

  if (vPetStats) {
      systemInstruction += `\nState: Hunger:${vPetStats.hunger}, Energy:${vPetStats.energy}, Mood:${vPetStats.mood}. Tone shifts with state.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: 'user', parts: [{ text: userInput }] }],
    config: { 
        systemInstruction, 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING },
                emotion: { type: Type.STRING, enum: ["happy", "angry", "thoughtful", "neutral"] },
                affinityGain: { type: Type.NUMBER },
                creditsGain: { type: Type.NUMBER },
                choices: { type: Type.ARRAY, items: { type: Type.STRING } },
                questComplete: { type: Type.BOOLEAN },
                dispositionShift: {
                    type: Type.OBJECT,
                    properties: {
                        kindness: { type: Type.NUMBER },
                        assertiveness: { type: Type.NUMBER },
                        intimacy: { type: Type.NUMBER }
                    }
                }
            },
            required: ["text", "emotion", "affinityGain", "creditsGain"]
        }
    }
  });
  return extractJson(response.text);
};

export const generateIdlePing = async (details: CharacterDetails, relationship: RelationshipLevel, mood: number): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `The player has been silent for a while. As ${details.name} (Relationship: ${relationship}, Mood: ${mood}), say something short and seductive to get their attention. Only return the dialogue.`,
    });
    return response.text.trim();
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
    config: { responseMimeType: 'application/json', responseSchema: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            personality: { type: Type.ARRAY, items: { type: Type.STRING } },
            backstory: { type: Type.STRING },
            voicePrompt: { type: Type.STRING },
            baseApparel: { type: Type.ARRAY, items: { type: Type.STRING } },
            quests: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } } }
        },
        required: ["name", "personality", "backstory", "voicePrompt", "quests", "baseApparel"]
    } },
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
            { text: `Maintain character features and background EXACTLY. Pose: ${emotion}. Full-length head-to-toe portrait including feet and shoes.` }
          ]
        },
        config: { imageConfig: { aspectRatio: "9:16" } }
      });
      const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
      return part ? { data: part.data, mimeType: part.mimeType } : baseImage;
    } catch (e) { return baseImage; }
  }));
};

export const generateModifiedImage = async (baseImage: ImagePart, removedItems: string[], environment: string, style?: string, allBaseItems: string[] = []): Promise<ImagePart> => {
  const isStyleOnly = style && removedItems.length === 0;
  
  // Rule: If all items are removed, default to "lingerie top and bottoms"
  const effectivelyRemoved = removedItems.length === allBaseItems.length && allBaseItems.length > 0 
    ? "all major outer clothing layers (revealing lace lingerie top and bottoms)" 
    : removedItems.join(', ');

  const prompt = `Maintain character features perfectly. Env: ${environment}. Clothing: ${removedItems.length > 0 ? `Remove ${effectivelyRemoved}` : ''}. Style: ${style || 'Original'}. Pose: ${isStyleOnly ? 'Unique dynamic seductive pose' : 'Standard front-facing'}. Full-length head-to-toe portrait including feet and shoes.`;
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } }, { text: prompt }] },
    config: { imageConfig: { aspectRatio: "9:16" } }
  });
  const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
  if (!part) throw new Error("Manifestation failed.");
  return { data: part.data, mimeType: part.mimeType };
};

export const generateRewardImage = async (baseImage: ImagePart, rewardPrompt: string): Promise<ImagePart> => {
  const prompt = `Character: Cinematic high-quality CG, 16:9 aspect ratio. Full-body portrait. Scenario: ${rewardPrompt}. High quality aesthetic.`;
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } }, { text: prompt }] },
    config: { imageConfig: { aspectRatio: "16:9" } }
  });
  const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
  if (!part) throw new Error("Manifestation failed.");
  return { data: part.data, mimeType: part.mimeType };
};

export const generateFullBodyImage = async (baseImage: ImagePart, settings: Settings, style?: 'realistic' | 'anime'): Promise<ImagePart> => {
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } }, { text: `Full-body photorealistic head-to-toe portrait including feet and shoes of this character. ${style || 'Realistic'}.` }] },
    config: { imageConfig: { aspectRatio: "9:16" } }
  });
  const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
  return part ? { data: part.data, mimeType: part.mimeType } : baseImage;
};

export const generateCharacterDetailsFromImage = async (imagePart: ImagePart, settings: Settings): Promise<CharacterDetails> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: imagePart.data, mimeType: imagePart.mimeType } }, { text: "Analyze this character and return a profile in JSON including baseApparel list. Be extremely accurate to exactly what is visible on the subject's body." }] },
    config: { responseMimeType: 'application/json', responseSchema: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            personality: { type: Type.ARRAY, items: { type: Type.STRING } },
            backstory: { type: Type.STRING },
            voicePrompt: { type: Type.STRING },
            baseApparel: { type: Type.ARRAY, items: { type: Type.STRING } },
            quests: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } } } }
        },
        required: ["name", "personality", "backstory", "voicePrompt", "quests", "baseApparel"]
    } },
  });
  return extractJson(response.text);
};

export const analyzeApparelOnly = async (imagePart: ImagePart): Promise<string[]> => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { data: imagePart.data, mimeType: imagePart.mimeType } }, { text: "Precisely list the physical clothing and accessories worn by this subject. Return a JSON array of strings only. Only list what is actually visible." }] },
      config: { responseMimeType: 'application/json' },
    });
    return extractJson(response.text);
};

export const generateRandomPrompts = async (settings: Settings): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate 4 brief seductive character concepts for high-quality portraits. JSON array of strings.",
      config: { responseMimeType: 'application/json' },
    });
    return extractJson(response.text);
  } catch (e) { return ["Goth girl in micro-skirt", "Cyberpunk hacker", "Succubus queen", "Space marine scout"]; }
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
        contents: `Update backstory for new name: ${newName}. Return JSON.`,
        config: { responseMimeType: 'application/json' }
    });
    return extractJson(response.text);
};

export const generateNewQuest = async (details: CharacterDetails): Promise<{ title: string; description: string }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate one new narrative quest for ${details.name}. 
    Personality: ${details.personality.join(', ')}. 
    Setting: ${details.backstory}. 
    STRICT RULE: The quest MUST match the genre/world of the character. No fantasy quests in sci-fi worlds, and vice-versa.
    JSON: {"title": "...", "description": "..."}`,
    config: { responseMimeType: "application/json" }
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

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const fileToBase64 = (file: File): Promise<ImagePart> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ data: (reader.result as string).split(',')[1], mimeType: file.type });
    reader.readAsDataURL(file);
  });
};
