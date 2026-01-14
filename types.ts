
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

export interface Reward {
  id: string;
  title: string;
  description: string;
  prompt: string;
  status: 'locked' | 'unlocked';
  image?: ImagePart;
  dateEarned: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
  type: 'gift' | 'consumable' | 'rarity';
  statImpact?: { hunger?: number; energy?: number; mood?: number; affinity?: number };
}

export interface BehaviorStats {
  kindness: number;     // 0-100 (Gentle vs Cold)
  assertiveness: number; // 0-100 (Submissive vs Dominant)
  intimacy: number;    // 0-100 (Formal vs Personal)
}

export interface CharacterDetails {
  name: string;
  personality: string[];
  backstory: string;
  quests: { title: string; description: string }[];
  voicePrompt: string;
  baseApparel: string[]; 
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
  currentEnvironment: string; 
  memoryBank: string[]; 
  chatHistory: ChatMessage[];
  armorLevel: number;
  isTtsEnabled?: boolean;
  hunger: number;
  energy: number;
  mood: number;
  rewards: Reward[];
  inventory: string[]; // List of Item IDs
  behaviorStats: BehaviorStats;
  wardrobe: ImagePart[]; // Unlocked full styles
  modifications: ImagePart[]; // Partial removals/mods
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
  choices?: string[]; 
}

export interface Settings {
    imageEndpoint: string;
    llmEndpoint: string;
    useLocalImage: boolean;
    useLocalLlm: boolean;
}
