
import React, { useState } from 'react';
import { Button } from './Button';

interface GeneratorFormProps {
  onSubmit: (prompt: string) => void;
}

export const GeneratorForm: React.FC<GeneratorFormProps> = ({ onSubmit }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt);
    }
  };

  return (
    <div className="bg-gray-900/50 p-6 rounded-b-lg border-x border-b border-gray-800">
      <form onSubmit={handleSubmit}>
        <label htmlFor="prompt" className="block text-sm font-medium text-green-400 mb-2">
          Character Description
        </label>
        <textarea
          id="prompt"
          rows={4}
          className="w-full bg-black border border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300 placeholder:text-gray-600"
          placeholder="e.g., brooding lunar sorceress with silver hair and mystical tattoos"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="mt-4 text-center">
          <Button type="submit" disabled={!prompt.trim()}>
            Forge Concepts
          </Button>
        </div>
      </form>
    </div>
  );
};
