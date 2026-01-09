
export type CharacterMode = 'generator' | 'uploader' | 'interactive';

export type AppState =
  | 'idle'
  | 'generatingConcepts'
  | 'selectingConcept'
  | 'generatingDetails'
  | 'displayingCharacter'
  | 'error';

export interface CharacterDetails {
  name: string;
  personality: string[];
  backstory: string;
  quests: { title: string; description:string }[];
  voicePrompt: string;
}

export interface CharacterImages {
  main: string;
  orthos: {
    front: string;
    side: string;
    back: string;
  };
  poses: string[]; // 0: Neutral, 1: Happy/Laugh, 2: Action/Angry
}

export interface CharacterData {
  details: CharacterDetails | null;
  images: CharacterImages | null;
  prompt: string;
  dimension: '2D' | '3D' | null;
  resonance?: number; // Dating-sim point system
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
