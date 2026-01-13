export type AppState =
  | 'idle'
  | 'generatingConcepts'
  | 'selectingConcept'
  | 'generatingDetails'
  | 'displayingCharacter'
  | 'error';

export interface ImagePart {
  data: string; // Base64
  mimeType: string;
}

export interface CharacterDetails {
  name: string;
  personality: string[];
  backstory: string;
  quests: { title: string; description: string }[];
  voicePrompt: string;
  baseApparel: string[]; // List of clothes identified by AI
}

export interface CharacterImages {
  main: ImagePart;
  original?: ImagePart;
  poses: ImagePart[];
  costumes?: ImagePart[];
}

export type RelationshipLevel = 'Stranger' | 'Acquaintance' | 'Companion' | 'Intimate' | 'Soulmate';

export interface InteractiveState {
  resonance: number;
  nexusCredits: number;
  affinityScore: number;
  relationshipLevel: RelationshipLevel;
  removedApparel: string[]; 
  currentEnvironment: string; // "Original", "Bedroom", "Beach", "Luxury Suite"
  memoryBank: string[]; 
  chatHistory: ChatMessage[];
  armorLevel: number;
  isTtsEnabled?: boolean;
}

export interface CharacterData {
  details: CharacterDetails | null;
  images: CharacterImages | null;
  prompt: string;
  isNeuralLinked: boolean;
  interactiveState?: InteractiveState;
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