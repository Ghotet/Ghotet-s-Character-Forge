
import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { CharacterDetails, Settings, ChatMessage } from '../types';

const API_KEY = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

const characterDetailsSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        personality: { type: Type.ARRAY, items: { type: Type.STRING } },
        backstory: { type: Type.STRING },
        voicePrompt: { type: Type.STRING, description: "A one sentence description of how the character sounds" },
        quests: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                }
            }
        },
    },
    required: ["name", "personality", "backstory", "voicePrompt", "quests"]
};

const FALLBACK_PROMPTS = [
    "A grizzled space pirate with a cybernetic parrot.",
    "An elemental spirit of a forgotten, overgrown city.",
    "A time-traveling detective from a neo-noir future.",
    "A mischievous rogue who can talk to shadows.",
    "A solar knight clad in living gold armor.",
    "A cybernetic monk seeking enlightenment in the code.",
    "A gothic vampire duelist with a rapier of frozen blood.",
    "A wasteland scavenger with a mechanical wolf companion."
];

export const generateCharacterSpeech = async (text: string, voicePrompt: string): Promise<Uint8Array> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say with a ${voicePrompt} voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");
  return decodeBase64(base64Audio);
};

export const getCharacterChatResponse = async (
  history: ChatMessage[], 
  userInput: string, 
  details: CharacterDetails
): Promise<{ text: string, emotion: string, resonanceChange?: number }> => {
  const systemInstruction = `You are ${details.name}. 
  Personality: ${details.personality.join(', ')}. 
  Backstory: ${details.backstory}. 
  Roleplay as this character in a dating-sim style interaction. Keep responses punchy and under 3 sentences.
  You MUST respond ONLY with a raw JSON object.
  JSON structure: {"text": "your spoken response", "emotion": "one of: happy, angry, thoughtful, neutral", "resonanceChange": number between -5 and 10 based on how the user's input would affect your relationship}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: 'user', parts: [{ text: userInput }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const rawText = response.text || "{}";
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Chat parsing error:", e);
    return { text: "My neural link is flickering...", emotion: "thoughtful", resonanceChange: 0 };
  }
};

export const rerollCharacterName = async (details: CharacterDetails): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this character profile, generate 1 unique and fitting name. 
    Personality: ${details.personality.join(', ')}. 
    Backstory: ${details.backstory}.
    Return ONLY the name string.`,
    config: { responseMimeType: 'text/plain' }
  });
  return response.text.trim();
};

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateConceptImages = async (prompt: string, dimension: any, settings: Settings): Promise<string[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: `Full-length standing character concept art. Head-to-toe view. The entire character including legs and shoes must be fully visible and centered in the frame. No cropping. Subject: ${prompt}. Cinematic lighting, white background.`,
    config: { imageConfig: { aspectRatio: "3:4" } }
  });
  return response.candidates?.[0]?.content?.parts
    ?.filter(p => p.inlineData)
    ?.map(p => p.inlineData!.data) || [];
};

export const generateCharacterDetailsFromPrompt = async (prompt: string, imageBase64: string, settings: Settings): Promise<CharacterDetails> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: imageBase64, mimeType: 'image/png' } }, { text: prompt }] },
    config: { responseMimeType: 'application/json', responseSchema: characterDetailsSchema },
  });
  return JSON.parse(response.text.trim());
};

export const generateOrthosAndPoses = async (imageBase64: string, desc: string, settings: Settings) => {
    const emotionPrompts = [
      "Head-to-toe full body view, standing neutral, entire body in frame.",
      "Head-to-toe full body view, laughing joyfully, wide smile, expressive standing pose.",
      "Head-to-toe full body view, aggressive angry combat pose, snarling expression.",
      "Head-to-toe full body view, thoughtful contemplative pose, finger to chin."
    ];

    const poses = await Promise.all(emotionPrompts.map(async (promptText) => {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { 
          parts: [
            { inlineData: { data: imageBase64, mimeType: 'image/png' } }, 
            { text: `Maintain character consistency. ${promptText}. Ensure the entire character fits in the frame from top to bottom.` }
          ] 
        },
        config: { imageConfig: { aspectRatio: "3:4" } }
      });
      return res.candidates![0].content.parts.find(p => p.inlineData)!.inlineData!.data;
    }));

    return { 
      orthos: { front: imageBase64, side: imageBase64, back: imageBase64 }, 
      poses 
    };
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
};

export const generateRandomPrompts = async (settings: Settings): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate 4 short character prompts for a fantasy game.",
      config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } },
    });
    return JSON.parse(response.text.trim());
  } catch (e) {
    // If quota exceeded or error, return local fallback
    console.warn("Using fallback prompts due to API error:", e);
    return FALLBACK_PROMPTS.sort(() => 0.5 - Math.random()).slice(0, 4);
  }
};

export const generateCharacterDetailsFromImage = async (imageBase64: string, settings: Settings): Promise<CharacterDetails> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: imageBase64, mimeType: 'image/png' } }, { text: "Analyze this character and create a profile in JSON." }] },
    config: { responseMimeType: 'application/json', responseSchema: characterDetailsSchema },
  });
  return JSON.parse(response.text.trim());
};

export const editImageWithInstructions = async (img: string, inst: string, settings: Settings) => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: { data: img, mimeType: 'image/png' } }, { text: inst }] }
    });
    return response.candidates![0].content.parts.find(p => p.inlineData)!.inlineData!.data;
};
