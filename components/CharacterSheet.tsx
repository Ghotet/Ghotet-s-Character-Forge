import React, { useState, useEffect } from 'react';
import type { CharacterData } from '../types';
import { ImageViewer } from './ImageViewer';
import { CharacterDetails } from './CharacterDetails';

interface CharacterSheetProps {
  data: CharacterData;
  onRedo: () => void;
  onTweak: (newPrompt: string) => void;
  onReset: () => void;
  onEditName: (name: string) => void;
  onUpdateName: () => Promise<void>;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ data, onRedo, onTweak, onReset, onEditName, onUpdateName }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!data.details || !data.images) {
    return null;
  }

  return (
    <div className={`transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800">
          <ImageViewer images={data.images} />
        </div>
        <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800">
          <CharacterDetails
            data={data}
            onRedo={onRedo}
            onTweak={onTweak}
            onEditName={onEditName}
            onUpdateName={onUpdateName}
          />
        </div>
      </div>
      <div className="text-center mt-8">
        <button onClick={onReset} className="text-gray-500 hover:text-green-400 transition-colors underline">
            Create a New Character
        </button>
      </div>
    </div>
  );
};