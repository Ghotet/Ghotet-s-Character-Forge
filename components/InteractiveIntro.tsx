
import React, { useState, useCallback } from 'react';
import { Button } from './Button';
import { GeneratorForm } from './GeneratorForm';
import { Settings } from '../types';

interface InteractiveIntroProps {
  onImport: (file: File, style?: 'realistic' | 'anime') => void;
  onGenerateConcepts: (prompt: string) => void;
  settings: Settings;
}

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-4 text-gray-500 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

export const InteractiveIntro: React.FC<InteractiveIntroProps> = ({ onImport, onGenerateConcepts, settings }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<'original' | 'realistic' | 'anime'>('original');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setCurrentPrompt('');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setCurrentPrompt('');
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleImportSubmit = () => {
    if (file) {
      onImport(file, selectedStyle === 'original' ? undefined : selectedStyle);
    }
  };

  const handleGenerateSubmit = (prompt: string) => {
    if (prompt.trim()) {
      onGenerateConcepts(prompt);
      setFile(null);
    }
  };

  const handleSelectRandomPrompt = (prompt: string) => {
    setCurrentPrompt(prompt);
    setFile(null);
  };

  const isPackage = file?.name.endsWith('.json') || file?.name.endsWith('.zip');

  return (
    <div className="bg-gray-900/30 p-12 rounded-b-2xl border-x border-b border-gray-800 text-center backdrop-blur-sm">
      <p className="text-green-400 font-bold uppercase tracking-widest text-sm mb-2">Neural Nexus Offline</p>
      <p className="text-xs text-gray-400 mb-8 text-center max-w-xl mx-auto">
        Activate a companion for interactive sessions. Describe a new archetype or import an existing Neural Bundle.
      </p>

      <GeneratorForm 
          onSubmit={handleGenerateSubmit} 
          settings={settings} 
          onSelectRandomPrompt={handleSelectRandomPrompt}
      />

      <div className="flex items-center my-8">
            <div className="flex-grow border-t border-gray-800"></div>
            <span className="flex-shrink mx-4 text-gray-600 text-xs font-bold uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-gray-800"></div>
        </div>

      <div
        className={`group flex justify-center items-center flex-col w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDragging ? 'border-green-500 bg-green-900/20' : 'border-gray-700 hover:border-green-600'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-upload-nexus')?.click()}
      >
        <UploadIcon />
        <p className="mb-2 text-sm text-gray-500 group-hover:text-green-400"><span className="font-semibold">Drop Neural Bundle (.zip) or Image</span></p>
        <p className="text-[10px] text-gray-600 uppercase tracking-tighter">PNG, JPG, JSON or ZIP</p>
        <input id="file-upload-nexus" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, application/json, application/zip" onChange={handleFileChange} />
      </div>

      {file && (
        <div className="mt-6 space-y-4 animate-fadeIn">
            <div className="p-4 bg-black/40 border border-gray-800 rounded-xl">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">Neural Style Override</p>
                <div className="flex justify-center gap-3">
                    {['original', 'realistic', 'anime'].map(s => (
                        <button 
                            key={s} 
                            onClick={() => setSelectedStyle(s as any)}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border rounded-md transition-all ${selectedStyle === s ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-700 text-gray-600 hover:border-gray-500'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className={`text-center py-2 px-4 rounded border ${isPackage ? 'border-green-500/50 bg-green-500/5 text-green-400' : 'border-gray-800 text-gray-400'}`}>
                <span className="text-xs font-mono uppercase tracking-widest">{isPackage ? 'Neural Bundle Detected' : 'Biological Scan Initialized'}</span>
                <div className="font-bold text-sm mt-1">{file.name}</div>
            </div>
        </div>
      )}

      <div className="mt-8 flex justify-center gap-4">
        <Button onClick={handleImportSubmit} disabled={!file} variant="primary" className="px-8">
          Sync Neural Link
        </Button>
      </div>
    </div>
  );
};
