export type CharacterMode = 'generator' | 'uploader' | 'interactive';

export type AppState =
  | 'idle'
  | 'generatingConcepts'
  | 'selectingConcept'
  | 'generatingDetails'
  | 'displayingCharacter'
  | 'error';

export interface ImagePart {
  data: string; // Base64 encoded string
  mimeType: string; // IANA standard MIME type, e.g., 'image/png', 'image/jpeg'
}

export interface CharacterDetails {
  name: string;
  personality: string[];
  backstory: string;
  quests: { title: string; description:string }[];
  voicePrompt: string;
}

export interface CharacterImages {
  main: ImagePart; // Changed from string to ImagePart
  orthos: {
    front: ImagePart; // Changed from string to ImagePart
    side: ImagePart; // Changed from string to ImagePart
    back: ImagePart; // Changed from string to ImagePart
  };
  poses: ImagePart[]; // Changed from string[] to ImagePart[]
  costumes?: ImagePart[]; // New: Stores ImagePart objects of unlocked costumes
}

export interface Gift {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: number; // how much resonance it boosts
}

export interface InteractiveState {
  resonance: number;
  nexusCredits: number;
  inventory: Gift[];
  memoryBank: string[]; // Stores snippets of conversation for persistent context
  chatHistory: ChatMessage[];
}

export interface CharacterData {
  details: CharacterDetails | null;
  images: CharacterImages | null;
  prompt: string;
  dimension: '2D' | '3D' | null;
  interactiveState?: InteractiveState; // Optional, for interactive mode
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  emotion?: 'neutral' | 'happy' | 'angry' | 'thoughtful';
}

export interface Settings {
    imageEndpoint: string;
    llmEndpoint: string;
    useLocalImage: boolean;
    useLocalLlm: boolean;
}