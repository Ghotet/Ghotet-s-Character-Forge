import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { generateRandomPrompts } from '../services/geminiService';
import type { Settings } from '../types';

interface GeneratorFormProps {
  onSubmit: (prompt: string, dimension: '2D' | '3D' | null) => void;
  settings: Settings;
}

const RerollIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 11M20 20l-1.5-1.5A9 9 0 003.5 13" />
    </svg>
);

const SkeletonButton = () => (
    <div className="h-12 bg-gray-800/50 rounded-md animate-pulse w-full"></div>
);

export const GeneratorForm: React.FC<GeneratorFormProps> = ({ onSubmit, settings }) => {
  const [prompt, setPrompt] = useState('');
  const [randomPrompts, setRandomPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);

  const fetchPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const prompts = await generateRandomPrompts(settings);
      setRandomPrompts(prompts);
    } catch (error) {
      console.error("Failed to fetch random prompts", error);
      setRandomPrompts([
          "A grizzled space pirate with a cybernetic parrot.",
          "An elemental spirit of a forgotten, overgrown city.",
          "A time-traveling detective from a neo-noir future.",
          "A mischievous rogue who can talk to shadows."
      ]);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);


  const handleSubmit = (dimension: '2D' | '3D' | null) => {
    if (prompt.trim()) {
      onSubmit(prompt, dimension);
    }
  };

  return (
    <div className="bg-gray-900/50 p-6 rounded-b-lg border-x border-b border-gray-800">
      <div className="text-center">
        <p className="max-w-xl mx-auto mb-6 text-gray-400">
          Welcome to the Forge. Your AI-powered concept artist for creating stunning video game characters. 
          Describe your vision, choose your dimension, and bring your hero to life.
        </p>
        
        <div className="max-w-xl mx-auto">
          <label htmlFor="prompt" className="sr-only">
            Character Description
          </label>
          <textarea
            id="prompt"
            rows={4}
            className="w-full bg-black border border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300 placeholder:text-gray-600 text-base"
            placeholder="e.g., brooding lunar sorceress with silver hair and mystical tattoos"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="mt-6">
            <Button onClick={() => handleSubmit(null)} disabled={!prompt.trim()} variant="primary" className="w-full sm:w-auto">
              Forge Concept
            </Button>
        </div>

        <div className="flex items-center my-6">
            <div className="flex-grow border-t border-gray-800"></div>
            <span className="flex-shrink mx-4 text-gray-600 text-xs font-bold uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-gray-800"></div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-green-400 mb-3 tracking-wider uppercase">Add a Dimensional Modifier</h3>
          <div className="flex justify-center items-center gap-4">
            <Button onClick={() => handleSubmit('2D')} disabled={!prompt.trim()} variant="secondary">
              Forge 2D Concept
            </Button>
            <Button onClick={() => handleSubmit('3D')} disabled={!prompt.trim()} variant="secondary">
              Forge 3D Concept
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-800/50">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-green-400 tracking-wider uppercase">Need Inspiration?</h3>
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
                      onClick={() => setPrompt(p)}
                      className="text-left text-sm px-4 py-3 font-medium rounded-md transition-all duration-300 bg-gray-700/30 border border-gray-700 text-gray-400 hover:bg-gray-600/50 hover:border-green-500 hover:text-green-400"
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