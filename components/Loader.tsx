import React from 'react';
import type { AppState } from '../types';

interface LoaderProps {
  state: AppState;
}

export const Loader: React.FC<LoaderProps> = ({ state }) => {
  const messages: Record<string, string> = {
    generatingConcepts: "Conjuring neural archetypes...",
    generatingDetails: "Synthesizing companion essence...",
  };
  
  const message = messages[state] || "Processing data...";

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-pulse">
      <div className="w-16 h-16 border-4 border-dashed border-green-500 rounded-full animate-spin mb-4"></div>
      <p className="text-lg font-semibold text-green-400" style={{ textShadow: '0 0 5px #39FF14' }}>
        {message}
      </p>
    </div>
  );
};