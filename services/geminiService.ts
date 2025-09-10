import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { CharacterDetails, Settings } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error(
    "API_KEY is not set. Please set the API_KEY environment variable."
  );
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const characterDetailsSchema = {
    type: Type.OBJECT,
    properties: {
        name: {
            type: Type.STRING,
            description: "A suitable and thematic name for the character based on their backstory, personality, and appearance."
        },
        personality: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 3-5 single-word personality traits.",
        },
        backstory: {
            type: Type.STRING,
            description: "A 2-3 paragraph backstory for the character.",
        },
        quests: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                }
            },
            description: "An array of 3 quest arcs with titles and short descriptions.",
        },
    }
};

/**
 * Converts a File object to a base64 encoded string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

/**
 * Generates images from a local A1111-compatible endpoint.
 */
const generateLocalImages = async (prompt: string, endpoint: string, numImages: number): Promise<string[]> => {
    const response = await fetch(`${endpoint}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: `high-quality, photorealistic fantasy concept art character portrait, ${prompt}`,
            negative_prompt: "low quality, blurry, cartoon, anime, deformed",
            steps: 25,
            cfg_scale: 7,
            width: 512,
            height: 512,
            batch_size: numImages,
        }),
    });
    if (!response.ok) throw new Error(`Local image generation failed: ${response.statusText}`);
    const data = await response.json();
    if (!data.images) throw new Error("Local API did not return images.");
    return data.images;
};

/**
 * Generates content from a local LM Studio-compatible (OpenAI) endpoint.
 */
const generateLocalLLMContent = async (endpoint: string, systemPrompt: string, userPrompt: string): Promise<any> => {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: "local-model", // LM Studio doesn't require a specific model name
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
        }),
    });

    if (!response.ok) throw new Error(`Local LLM request failed: ${response.statusText}`);
    const data = await response.json();
    try {
        // The local model's response is expected to be a JSON string in the content.
        const content = data.choices[0].message.content;
        return JSON.parse(content.trim());
    } catch (e) {
        throw new Error("Local LLM did not return valid JSON.");
    }
};

/**
 * Generates 3-5 concept images based on a text prompt, routing to local or cloud API.
 */
export const generateConceptImages = async (prompt: string, settings: Settings): Promise<string[]> => {
  // Route image generation request based on user settings.
  if (settings.useLocalImage) {
    console.log(`Routing image generation to local endpoint: ${settings.imageEndpoint}`);
    return generateLocalImages(prompt, settings.imageEndpoint, 4);
  }
  
  console.log(`Generating concepts for: ${prompt}`);
  if (!API_KEY) throw new Error("API_KEY not configured");
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: `Generate 4 distinct, high-quality, photorealistic fantasy concept art character portraits based on the following description: "${prompt}". Ensure variety in composition, lighting, and mood.`,
    config: { numberOfImages: 4, outputMimeType: 'image/png' },
  });
  return response.generatedImages.map(img => img.image.imageBytes);
};

/**
 * Generates character details from a prompt and image, routing to local or cloud API.
 */
export const generateCharacterDetailsFromPrompt = async (prompt: string, imageBase64: string, settings: Settings): Promise<CharacterDetails> => {
  // Route LLM request based on user settings.
  if (settings.useLocalLlm) {
    console.log(`Routing LLM request to local endpoint: ${settings.llmEndpoint}`);
    const systemPrompt = `You are a creative assistant. Based on the user's prompt, generate a character profile. Respond with ONLY a valid JSON object matching this schema: ${JSON.stringify(characterDetailsSchema, null, 2)}. Do not include markdown formatting or any other text.`;
    const userPrompt = `Character Prompt: "${prompt}". Generate the profile.`;
    return generateLocalLLMContent(settings.llmEndpoint, systemPrompt, userPrompt);
  }
  
  console.log(`Generating details for prompt: ${prompt}`);
  if (!API_KEY) throw new Error("API_KEY not configured");
  const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/png' } };
  const textPart = { text: `Based on this description: "${prompt}" and the provided image, generate a character profile.` };
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
    config: { responseMimeType: 'application/json', responseSchema: characterDetailsSchema },
  });
  return JSON.parse(response.text.trim());
};

/**
 * Generates character details from an image, routing to local or cloud API.
 */
export const generateCharacterDetailsFromImage = async (imageBase64: string, settings: Settings): Promise<CharacterDetails> => {
  // Route LLM request based on user settings.
  if (settings.useLocalLlm) {
    console.log(`Routing LLM request to local endpoint: ${settings.llmEndpoint}`);
    const systemPrompt = `You are a creative assistant. Based on a character image, generate a character profile. Respond with ONLY a valid JSON object matching this schema: ${JSON.stringify(characterDetailsSchema, null, 2)}. Do not include markdown formatting or any other text.`;
    const userPrompt = "Analyze the character in the provided image and generate their profile.";
    return generateLocalLLMContent(settings.llmEndpoint, systemPrompt, userPrompt);
  }
  
  console.log('Generating details from uploaded image.');
  if (!API_KEY) throw new Error("API_KEY not configured");
  const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/png' } };
  const textPart = { text: `Analyze the character in this image. Based on their appearance, attire, and expression, generate a detailed character profile.` };
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
    config: { responseMimeType: 'application/json', responseSchema: characterDetailsSchema },
  });
  return JSON.parse(response.text.trim());
};

/**
 * Generates a character name, routing to local or cloud API.
 */
export const generateCharacterName = async (characterDescription: string, settings: Settings): Promise<string> => {
    // Route LLM request based on user settings.
    if (settings.useLocalLlm) {
        console.log(`Routing name generation to local endpoint: ${settings.llmEndpoint}`);
        const systemPrompt = "You are a name generator. Based on the user's prompt, provide a single, thematic name. Respond with ONLY the name and nothing else.";
        const userPrompt = `Character description: "${characterDescription}". Generate a name.`;
        const response = await generateLocalLLMContent(settings.llmEndpoint, systemPrompt, userPrompt);
        // Assuming the local LLM might return JSON like {"name": "Elara"}, we try to find the name.
        const name = response.name || response.toString();
        return name.trim().replace(/["*]/g, '');
    }

    console.log(`Generating a new name for: ${characterDescription}`);
    if (!API_KEY) throw new Error("API_KEY not configured");
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the character description "${characterDescription}", generate a single, suitable, thematic name. Return only the name and nothing else.`,
    });
    return response.text.trim().replace(/["*]/g, '');
};

/**
 * Generates orthos and poses, routing to local or cloud API.
 */
export const generateOrthosAndPoses = async (imageBase64: string, characterDescription: string, settings: Settings): Promise<{ orthos: { front: string; side: string; back: string; }; poses: string[]; }> => {
    console.log(`Generating orthos and poses for: ${characterDescription}`);
    
    const generateImageView = async (prompt: string, useImg2Img: boolean): Promise<string> => {
        // Route image generation request based on user settings.
        if (settings.useLocalImage) {
            const endpoint = settings.imageEndpoint;
            const apiPath = useImg2Img ? '/sdapi/v1/img2img' : '/sdapi/v1/txt2img';
            const payload: any = {
                prompt: prompt,
                negative_prompt: "low quality, blurry, cartoon, anime, deformed",
                steps: 30,
                cfg_scale: 7,
                width: 512,
                height: 512,
            };
            if (useImg2Img) {
                payload.init_images = [imageBase64];
                payload.denoising_strength = 0.6;
            }
            const response = await fetch(`${endpoint}${apiPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Local image view generation failed: ${response.statusText}`);
            const data = await response.json();
            return data.images[0];
        }

        if (!API_KEY) throw new Error("API_KEY not configured");
        const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/png' } };
        const textPart = { text: prompt };
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("API did not return an image.");
    };

    const [front, side, back, pose1, pose2] = await Promise.all([
        generateImageView(`Generate a clean, full-body, orthographic front view of the character for a 3D model sheet. Neutral pose and flat lighting.`, true),
        generateImageView(`Generate a clean, full-body, orthographic side view (left) of the character for a 3D model sheet. Neutral pose and flat lighting.`, true),
        generateImageView(`Generate a clean, full-body, orthographic back view of the character for a 3D model sheet. Neutral pose and flat lighting.`, true),
        generateImageView(`Generate a dynamic action pose of the character, consistent with their description as a "${characterDescription}". Cinematic lighting.`, true),
        generateImageView(`Generate an expressive character pose of the character, consistent with their description as a "${characterDescription}". Dramatic lighting.`, true),
    ]);

    return {
        orthos: { front, side, back },
        poses: [pose1, pose2],
    };
};
