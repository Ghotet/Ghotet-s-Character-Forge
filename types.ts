export type CharacterMode = 'generator' | 'uploader';

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
}

export interface CharacterImages {
  main: string;
  orthos: {
    front: string;
    side: string;
    back: string;
  };
  poses: string[];
}

export interface CharacterData {
  details: CharacterDetails | null;
  images: CharacterImages | null;
  prompt: string;
}