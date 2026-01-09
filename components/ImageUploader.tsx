
import React, { useState, useCallback } from 'react';
import { Button } from './Button';

interface ImageUploaderProps {
  onUpload: (file: File, instructions?: string) => void;
  title?: string;
  description?: string;
}

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-4 text-gray-500 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onUpload, 
  title = "Reforge Image", 
  description = "Upload a character drawing, portrait, or even a rough sketch to bring it to life in the Forge." 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
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

  const handleSubmit = () => {
    if (file) {
      onUpload(file, instructions.trim() || undefined);
    }
  };

  const isPackage = file?.name.endsWith('.json') || file?.name.endsWith('.zip');

  return (
    <div className="bg-gray-900/50 p-6 rounded-b-lg border-x border-b border-gray-800">
      <h3 className="text-center text-green-400 font-bold uppercase tracking-widest text-sm mb-2">{title}</h3>
      <p className="text-xs text-gray-400 mb-4 text-center">
        {description}
      </p>
      
      <div 
        className={`group flex justify-center items-center flex-col w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDragging ? 'border-green-500 bg-green-900/20' : 'border-gray-700 hover:border-green-600'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <UploadIcon />
        <p className="mb-2 text-sm text-gray-500 group-hover:text-green-400"><span className="font-semibold">Drop image or Forge Bundle (.zip)</span></p>
        <p className="text-[10px] text-gray-600 uppercase tracking-tighter">PNG, JPG, JSON or ZIP</p>
        <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, application/json, application/zip" onChange={handleFileChange} />
      </div>

      {file && (
        <div className="mt-6 space-y-4 animate-fadeIn">
          <div className={`text-center py-2 px-4 rounded border ${isPackage ? 'border-green-500/50 bg-green-500/5 text-green-400' : 'border-gray-800 text-gray-400'}`}>
            <span className="text-xs font-mono uppercase tracking-widest">{isPackage ? 'Forge Bundle Detected' : 'Biological Scan Initialized'}</span>
            <div className="font-bold text-sm mt-1">{file.name}</div>
          </div>
          
          {!isPackage && (
            <div className="max-w-md mx-auto">
              <label htmlFor="instructions" className="block text-[10px] font-bold text-green-500 uppercase tracking-widest mb-2">
                Neural Overrides (Optional)
              </label>
              <textarea
                id="instructions"
                rows={3}
                className="w-full bg-black border border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm font-mono"
                placeholder="Initial personality directives..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-center">
        <Button onClick={handleSubmit} disabled={!file} className="w-full sm:w-auto px-12">
          {isPackage ? 'Sync Neural Link' : 'Establish Link'}
        </Button>
      </div>
    </div>
  );
};
