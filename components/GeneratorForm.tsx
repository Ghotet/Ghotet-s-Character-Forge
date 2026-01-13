import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { generateRandomPrompts } from '../services/geminiService';
import type { Settings } from '../types';

interface GeneratorFormProps {
  onSubmit: (prompt: string) => void; // Removed dimension parameter
  settings: Settings;
  onSelectRandomPrompt: (prompt: string) => void; // New prop for selecting a random prompt
}

const RerollIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 11M20 20l-1.5-1.5A9 9 0 003.5 13" />
    </svg>
);

const SkeletonButton = () => (
    <div className="h-12 bg-gray-800/50 rounded-md animate-pulse w-full"></div>
);

export const GeneratorForm: React.FC<GeneratorFormProps> = ({ onSubmit, settings, onSelectRandomPrompt }) => {
  const [prompt, setPrompt] = useState('');
  const [randomPrompts, setRandomPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);

  const fetchPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      // Prompts are now implicitly for photorealistic, full-body characters
      const prompts = await generateRandomPrompts(settings);
      setRandomPrompts(prompts);
    } catch (error) {
      console.error("Failed to fetch random prompts", error);
      setRandomPrompts([
          "A seductive dark elf with glowing red eyes and tiny leather armor, full-body photorealistic.",
          "A playful kitsune in a revealing silk kimono with fluffy tails, full-body photorealistic.",
          "A stunning cyberpunk girl in a tight glowing latex bodysuit, full-body photorealistic.",
          "A beautiful solar knight with wings and gold bikini armor, full-body photorealistic."
      ]);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [settings]); // Added settings to dependency array to re-fetch if settings change

  const handleSubmit = () => { // Removed dimension parameter
    if (prompt.trim()) {
      onSubmit(prompt); // Only passes prompt
    }
  };

  const handleSelectAndSetPrompt = (p: string) => {
    setPrompt(p);
    onSelectRandomPrompt(p); // Call the new prop to lift state up
  };

  return (
    <div className="bg-gray-900/50 p-6 rounded-b-lg border-x border-b border-gray-800">
      <div className="text-center">
        <p className="max-w-xl mx-auto mb-6 text-gray-400">
          Describe the blueprint of your ideal neural companion. She will be manifested as a photorealistic, full-body archetype.
        </p>
        
        <div className="max-w-xl mx-auto">
          <label htmlFor="prompt" className="sr-only">
            Character Blueprint
          </label>
          <textarea
            id="prompt"
            rows={4}
            className="w-full bg-black border border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300 placeholder:text-gray-600 text-base font-mono"
            placeholder="e.g., alluring moon priestess with silver hair and revealing ethereal robes"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="mt-6">
            <Button onClick={handleSubmit} disabled={!prompt.trim()} variant="primary" className="w-full sm:w-auto px-12">
              Generate Concepts
            </Button>
        </div>

        {/* Removed dimension selection buttons */}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-800/50">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-green-400 tracking-wider uppercase">Archetype Sparks</h3>
            <button 
              onClick={fetchPrompts} 
              disabled={isLoadingPrompts}
              className="text-gray-500 hover:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-wait"
              aria-label="Get new prompts"
            >
                <RerollIcon className={`w-5 h-5 ${isLoadingPrompts ? 'animate-spin' : ''}`} />
            </button>
        </div>
        
        {isLoadingPrompts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SkeletonButton />
                <SkeletonButton />
                <SkeletonButton />
                <SkeletonButton />
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {randomPrompts.map((p, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSelectAndSetPrompt(p)} // Use new handler
                      className="text-left text-[11px] px-4 py-3 font-medium rounded-md transition-all duration-300 bg-gray-700/20 border border-gray-700/50 text-gray-400 hover:bg-green-500/10 hover:border-green-500 hover:text-green-400"
                    >
                        {p}
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};