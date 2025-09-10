import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { CharacterDetails } from '../types';

// IMPORTANT: This is a placeholder for the real API key.
// In a production environment, this should be handled securely and not hardcoded.
// For this project, we assume `process.env.API_KEY` is available.
const API_KEY = process.env.API_KEY;

// Check if the API key is available. If not, log an error.
if (!API_KEY) {
  console.error(
    "API_KEY is not set. Please set the API_KEY environment variable."
  );
}

// Initialize the GoogleGenAI client
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
 * Generates 3-5 concept images based on a text prompt.
 */
export const generateConceptImages = async (prompt: string): Promise<string[]> => {
  console.log(`Generating concepts for: ${prompt}`);

  if (!API_KEY) throw new Error("API_KEY not configured");
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `Generate 4 distinct, high-quality, photorealistic fantasy concept art character portraits based on the following description: "${prompt}". Ensure variety in composition, lighting, and mood.`,
      config: { numberOfImages: 4, outputMimeType: 'image/png' },
    });
    return response.generatedImages.map(img => img.image.imageBytes);
  } catch (error) {
    console.error("Error generating concept images:", error);
    throw new Error("Failed to generate concept images from API.");
  }
};

/**
 * Generates character details (personality, backstory, quests) from a prompt and a selected image.
 */
export const generateCharacterDetailsFromPrompt = async (prompt: string, imageBase64: string): Promise<CharacterDetails> => {
  console.log(`Generating details for prompt: ${prompt}`);

  if (!API_KEY) throw new Error("API_KEY not configured");
  try {
    const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/png' } };
    const textPart = { text: `Based on this description: "${prompt}" and the provided image, generate a character profile.` };
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: characterDetailsSchema,
      },
    });

    const parsedResponse = JSON.parse(response.text.trim());
    return parsedResponse;
  } catch (error) {
    console.error("Error generating character details from prompt:", error);
    throw new Error("Failed to generate character details from API.");
  }
};

/**
 * Generates character details by analyzing a user-uploaded image.
 */
export const generateCharacterDetailsFromImage = async (imageBase64: string): Promise<CharacterDetails> => {
  console.log('Generating details from uploaded image.');

  if (!API_KEY) throw new Error("API_KEY not configured");
  try {
    const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/png' } };
    const textPart = { text: `Analyze the character in this image. Based on their appearance, attire, and expression, generate a detailed character profile.` };
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: characterDetailsSchema,
      },
    });

    const parsedResponse = JSON.parse(response.text.trim());
    return parsedResponse;
  } catch (error) {
    console.error("Error generating character details from image:", error);
    throw new Error("Failed to generate character details from API.");
  }
};

/**
 * Generates a new character name based on a description.
 */
export const generateCharacterName = async (characterDescription: string): Promise<string> => {
    console.log(`Generating a new name for: ${characterDescription}`);

    if (!API_KEY) throw new Error("API_KEY not configured");
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on the character description "${characterDescription}", generate a single, suitable, thematic name. Return only the name and nothing else.`,
        });

        // Clean up the response to ensure it's just the name.
        return response.text.trim().replace(/["*]/g, '');
    } catch (error) {
        console.error("Error generating character name:", error);
        throw new Error("Failed to generate a new name from API.");
    }
};


/**
 * Generates orthographic views and action poses from a selected image.
 */
export const generateOrthosAndPoses = async (imageBase64: string, characterDescription: string): Promise<{ orthos: { front: string; side: string; back: string; }; poses: string[]; }> => {
    console.log(`Generating orthos and poses for: ${characterDescription}`);
    
    const generateImageView = async (prompt: string): Promise<string> => {
        if (!API_KEY) throw new Error("API_KEY not configured");
        try {
            const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/png' } };
            const textPart = { text: prompt };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts: [imagePart, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
            throw new Error("API did not return an image.");
        } catch (error) {
            console.error(`Error generating image view for prompt "${prompt}":`, error);
            // Fallback to a placeholder on error to avoid breaking the UI
            return 'https://loremflickr.com/512/512/error';
        }
    };

    // Use Promise.all to run them concurrently for speed
    const [front, side, back, pose1, pose2] = await Promise.all([
        generateImageView(`Generate a clean, full-body, orthographic front view of the character for a 3D model sheet. Neutral pose and flat lighting.`),
        generateImageView(`Generate a clean, full-body, orthographic side view (left) of the character for a 3D model sheet. Neutral pose and flat lighting.`),
        generateImageView(`Generate a clean, full-body, orthographic back view of the character for a 3D model sheet. Neutral pose and flat lighting.`),
        generateImageView(`Generate a dynamic action pose of the character, consistent with their description as a "${characterDescription}". Cinematic lighting.`),
        generateImageView(`Generate an expressive character pose of the character, consistent with their description as a "${characterDescription}". Dramatic lighting.`),
    ]);

    return {
        orthos: { front, side, back },
        poses: [pose1, pose2],
    };
};