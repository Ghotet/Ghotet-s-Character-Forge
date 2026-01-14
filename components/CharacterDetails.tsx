import React, { useMemo, useState } from 'react';
import type { CharacterData, CharacterDetails as CharacterDetailsType, ImagePart } from '../types';
import { analyzeApparelOnly } from '../services/geminiService';

interface CharacterDetailsProps {
  data: CharacterData;
  onUpdateCharacterDetails: (newDetails: Partial<CharacterDetailsType>) => void;
  settings: any;
  onReset: () => void;
  selectedPose: ImagePart;
  onSelectImage: (image: ImagePart) => void;
  onStartQuest?: (questTitle: string, questDesc: string) => void;
  // Shared Renaming Props
  isRenaming: boolean;
  setIsRenaming: (val: boolean) => void;
  newNameInput: string;
  setNewNameInput: (val: string) => void;
  handleRenameSubmit: () => Promise<void>;
  handleRandomRename: () => Promise<void>;
}

const DiceIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4z M9 9h.01 M15 9h.01 M9 15h.01 M15 15h.01 M12 12h.01" />
    </svg>
);

const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const RefreshIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 11M20 20l-1.5-1.5A9 9 0 003.5 13" />
    </svg>
);

export const CharacterDetails: React.FC<CharacterDetailsProps> = ({ 
    data, 
    selectedPose, 
    onSelectImage, 
    isRenaming,
    setIsRenaming,
    newNameInput,
    setNewNameInput,
    handleRenameSubmit,
    handleRandomRename,
    onUpdateCharacterDetails
}) => {
  const details = data.details!;
  const images = data.images!;
  const [isScanning, setIsScanning] = useState(false);

  // Filter out costumes to move them to Vault, only show base poses here
  const galleryItems = useMemo(() => {
    const items: {img: ImagePart, label: string}[] = [];
    if (images.original) items.push({ img: images.original, label: 'Origin' });
    images.poses.forEach((pose, i) => {
        const label = ['Neutral', 'Joy', 'Anger', 'Thoughtful'][i];
        if (images.original?.data !== pose.data) items.push({ img: pose, label });
    });
    // Costumes moved to Vault Gallery
    return items;
  }, [images]);

  const handleApparelScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
        const newApparel = await analyzeApparelOnly(images.original || images.poses[0]);
        onUpdateCharacterDetails({ baseApparel: newApparel });
    } catch (e) {
        console.error("Scan failed", e);
    } finally {
        setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Nexus Profile Header */}
      <div className="mb-6">
          <label className="text-[10px] text-green-500 font-bold uppercase tracking-[0.3em] block mb-1 opacity-60">Neural Profile</label>
          
          {isRenaming ? (
            <div className="flex items-center gap-2 mt-1">
                <input 
                    autoFocus
                    className="bg-black border-b border-green-500/50 text-xl font-bold text-white uppercase outline-none font-orbitron w-full px-2 py-1" 
                    value={newNameInput} 
                    onChange={e => setNewNameInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleRenameSubmit()}
                />
                <button onClick={handleRandomRename} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300 transition-colors" title="Randomize">
                    <DiceIcon />
                </button>
                <button onClick={handleRenameSubmit} className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/40 text-green-400 transition-colors" title="Save">
                    <CheckIcon />
                </button>
                <button onClick={() => setIsRenaming(false)} className="p-2 bg-red-900/20 rounded-lg hover:bg-red-900/40 text-red-400 transition-colors" title="Cancel">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 mt-1">
                <h2 className="text-2xl font-bold text-white tracking-[0.1em] uppercase font-orbitron">{details.name}</h2>
                <button onClick={() => setIsRenaming(true)} className="flex items-center gap-1.5 text-[9px] font-bold text-green-500/60 hover:text-green-400 uppercase tracking-widest transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Edit
                </button>
            </div>
          )}
      </div>

      {/* Synapse Gallery History (Poses only) */}
      <div className="mb-4 pb-4 border-b border-gray-800/50">
        <label className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-3 block">Neural Core States</label>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {galleryItems.map((item, i) => (
                <div 
                    key={i} 
                    onClick={() => onSelectImage(item.img)} 
                    className={`flex-shrink-0 snap-start w-20 h-28 rounded-lg border-2 cursor-pointer transition-all duration-300 group relative ${selectedPose.data === item.img.data ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-105' : 'border-gray-800 hover:border-gray-600'}`}
                >
                    <img src={`data:${item.img.mimeType};base64,${item.img.data}`} alt={item.label} className="w-full h-full object-cover rounded-md" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 text-[8px] text-center text-gray-400 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity uppercase">{item.label}</div>
                </div>
            ))}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-3 custom-scrollbar space-y-6">
        <div>
            <label className="text-[10px] text-green-500 font-bold uppercase tracking-[0.2em] block mb-2">Manifest Backstory</label>
            <p className="text-gray-400 text-xs leading-relaxed font-light">{details.backstory}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-[10px] text-green-500 font-bold uppercase tracking-widest block mb-2">Nexus Traits (Leveling)</label>
                <div className="flex flex-wrap gap-2">
                    {details.personality.map(t => <span key={t} className="bg-green-500/5 border border-green-500/20 text-green-400/80 px-2 py-0.5 rounded text-[9px] uppercase font-mono">{t}</span>)}
                    <span className="border border-dashed border-gray-700 text-gray-700 px-2 py-0.5 rounded text-[9px] uppercase font-mono">???</span>
                </div>
            </div>
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] text-green-500 font-bold uppercase tracking-widest block">Detected Layers</label>
                    <button 
                        onClick={handleApparelScan} 
                        disabled={isScanning}
                        className={`text-[8px] text-green-500/60 hover:text-green-400 uppercase tracking-widest flex items-center gap-1 transition-colors ${isScanning ? 'animate-pulse' : ''}`}
                    >
                        <RefreshIcon />
                        {isScanning ? 'Scanning' : 'Correct Scan'}
                    </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {details.baseApparel.map(a => (
                        <span key={a} className="bg-gray-800/40 border border-gray-700/50 text-gray-500 px-2 py-0.5 rounded text-[8px] uppercase">{a}</span>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
