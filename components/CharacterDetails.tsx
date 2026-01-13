
import React, { useMemo } from 'react';
import type { CharacterData, CharacterDetails as CharacterDetailsType, ImagePart } from '../types';

interface CharacterDetailsProps {
  data: CharacterData;
  onUpdateCharacterDetails: (newDetails: Partial<CharacterDetailsType>) => void;
  settings: any;
  onReset: () => void;
  selectedPose: ImagePart;
  onSelectImage: (image: ImagePart) => void;
  onStartQuest?: (questTitle: string, questDesc: string) => void;
}

export const CharacterDetails: React.FC<CharacterDetailsProps> = ({ data, selectedPose, onSelectImage, onStartQuest }) => {
  const details = data.details!;
  const images = data.images!;

  const galleryItems = useMemo(() => {
    const items: {img: ImagePart, label: string}[] = [];
    if (images.original) items.push({ img: images.original, label: 'Origin' });
    images.poses.forEach((pose, i) => {
        const label = ['Neutral', 'Joy', 'Anger', 'Seduction'][i];
        if (images.original?.data !== pose.data) items.push({ img: pose, label });
    });
    images.costumes?.forEach((costume, i) => items.push({ img: costume, label: `Mod ${i + 1}` }));
    return items;
  }, [images]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Nexus Profile Header */}
      <div className="mb-4">
          <label className="text-[10px] text-green-500 font-bold uppercase tracking-[0.3em] block mb-1 opacity-60">Neural Profile</label>
          <h2 className="text-2xl font-bold text-white tracking-[0.1em] uppercase font-orbitron">{details.name}</h2>
      </div>

      {/* Synapse Gallery History */}
      <div className="mb-4 pb-4 border-b border-gray-800/50">
        <label className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-3 block">Synapse Memory Log</label>
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
                <label className="text-[10px] text-green-500 font-bold uppercase tracking-widest block mb-2">Neural Traits</label>
                <div className="flex flex-wrap gap-2">
                    {details.personality.map(t => <span key={t} className="bg-green-500/5 border border-green-500/20 text-green-400/80 px-2 py-0.5 rounded text-[9px] uppercase font-mono">{t}</span>)}
                </div>
            </div>
            <div>
                <label className="text-[10px] text-green-500 font-bold uppercase tracking-widest block mb-2">Initial Layers</label>
                <div className="flex flex-wrap gap-1.5">
                    {details.baseApparel.map(a => (
                        <span key={a} className="bg-gray-800/40 border border-gray-700/50 text-gray-500 px-2 py-0.5 rounded text-[8px] uppercase">{a}</span>
                    ))}
                </div>
            </div>
        </div>

        <div>
            <label className="text-[10px] text-green-500 font-bold uppercase tracking-widest block mb-2">Narrative Arc Nodes</label>
            <div className="space-y-2 pb-4">
                {details.quests.map((q, i) => (
                    <button 
                        key={i} 
                        onClick={() => onStartQuest?.(q.title, q.description)}
                        className="w-full text-left p-3 bg-white/5 border border-gray-800 rounded-xl group hover:border-green-500/60 transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.1)] relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[7px] bg-green-500 text-black font-bold px-1 rounded">LAUNCH</span>
                        </div>
                        <h5 className="text-[10px] font-bold text-gray-300 uppercase group-hover:text-green-400">{q.title}</h5>
                        <p className="text-[9px] text-gray-500 mt-1 leading-tight">{q.description}</p>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
