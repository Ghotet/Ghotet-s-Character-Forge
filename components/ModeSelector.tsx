
import React from 'react';
import type { CharacterMode } from '../types';

interface ModeSelectorProps {
  currentMode: CharacterMode;
  onSetMode: (mode: CharacterMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onSetMode }) => {
  const getButtonClasses = (mode: CharacterMode) => {
    const base = 'w-1/3 py-3 text-center font-semibold uppercase tracking-widest text-[10px] sm:text-xs transition-all duration-300 border-b-2';
    if (currentMode === mode) {
      return `${base} border-green-500 text-green-400 shadow-[0_5px_15px_-5px_rgba(50,255,50,0.4)]`;
    }
    return `${base} border-gray-800 text-gray-500 hover:text-green-500 hover:border-green-600`;
  };

  return (
    <div className="flex w-full bg-black/30 rounded-t-lg overflow-hidden border-x border-t border-gray-800">
      <button className={getButtonClasses('generator')} onClick={() => onSetMode('generator')}>
        Forge
      </button>
      <button className={getButtonClasses('uploader')} onClick={() => onSetMode('uploader')}>
        Reforge
      </button>
      <button className={getButtonClasses('interactive')} onClick={() => onSetMode('interactive')}>
        Interactive
      </button>
    </div>
  );
};
