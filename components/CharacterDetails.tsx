import React, { useState, useEffect } from 'react';
import type { CharacterData } from '../types';
import { Button } from './Button';
import { generateCharacterSpeech, decodeAudioData } from '../services/geminiService';
import JSZip from 'jszip';

interface CharacterDetailsProps {
  data: CharacterData;
  onRedo: () => void;
  onTweak: (newPrompt: string) => void;
  onEditName: (name: string) => void; 
  onUpdateName: () => Promise<void>; 
}

const AudioIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
  </svg>
);

const ExportIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

// Correct Dice Icon
const DiceIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 11M20 20l-1.5-1.5A9 9 0 003.5 13" />
    </svg>
);

const CheckIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
);

export const CharacterDetails: React.FC<CharacterDetailsProps> = ({ data, onRedo, onTweak, onEditName, onUpdateName }) => {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [tempName, setTempName] = useState(data.details?.name || '');
  
  const details = data.details!;
  const images = data.images!;

  useEffect(() => {
    setTempName(details.name);
  }, [details.name]);

  const playVoice = async () => {
    if (isPlayingVoice) return;
    setIsPlayingVoice(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const safePersonalityForVoice = details.personality ?? []; // Defensive check
      const speechText = `I am ${details.name}. ${details.backstory.split('.')[0]}. My essence is ${safePersonalityForVoice.slice(0,2).join(' and ')}.`;
      const audioBytes = await generateCharacterSpeech(speechText, details.voicePrompt);
      const audioBuffer = await decodeAudioData(audioBytes, audioCtx, 24000, 1);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => setIsPlayingVoice(false);
      source.start();
    } catch (e) {
      console.error(e);
      setIsPlayingVoice(false);
    }
  };

  const handleConfirmRename = () => {
    const newName = tempName.trim();
    if (newName && newName !== details.name) {
      onEditName(newName);
    }
  };

  const handleRerollName = async () => {
    setIsUpdatingName(true);
    try {
        await onUpdateName();
    } finally {
        setIsUpdatingName(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const safeName = details.name.replace(/\s+/g, '_');
      const safePersonalityForBio = details.personality ?? []; // Defensive check

      const bioText = `
=== ${details.name.toUpperCase()} ===
PERSONALITY: ${safePersonalityForBio.join(', ')}
VOICE PROFILE: ${details.voicePrompt}

BACKSTORY:
${details.backstory}

NARRATIVE ARCS:
${details.quests.map(q => `- ${q.title}: ${q.description}`).join('\n')}

FORGED VIA GHOTET CHARACTER FORGE
      `.trim();
      zip.file(`${safeName}_Bio.txt`, bioText);

      // Include interactiveState and costumes in the export package
      const exportPackage = {
          metadata: { app: "Ghotet Forge", version: "3.0", timestamp: new Date().toISOString() },
          character: {
              details,
              images: {
                  main: images.main,
                  poses: images.poses,
                  orthos: images.orthos,
                  costumes: images.costumes || [], // Ensure costumes are included
              },
              interactiveState: data.interactiveState, // Include interactive state
          }
      };
      zip.file(`${safeName}_Neural_Package.json`, JSON.stringify(exportPackage, null, 2));

      const imgFolder = zip.folder("images");
      if (imgFolder) {
        imgFolder.file("main.png", images.main.data, { base64: true }); // Access .data property
        imgFolder.file("pose_neutral.png", images.poses[0].data, { base64: true }); // Access .data property
        imgFolder.file("pose_happy.png", images.poses[1].data, { base64: true }); // Access .data property
        imgFolder.file("pose_angry.png", images.poses[2].data, { base64: true }); // Access .data property
        imgFolder.file("pose_thoughtful.png", images.poses[3].data, { base64: true }); // Access .data property
        // Export costumes too
        images.costumes?.forEach((costume, idx) => {
            imgFolder.file(`costume_${idx + 1}.png`, costume.data, { base64: true }); // Access .data property
        });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}_Forge_Bundle.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setIsExporting(false);
    }
  };

  const hasNameChanged = tempName !== details.name;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start border-b border-gray-800 pb-4">
        <div className="flex-grow group">
          <label className="text-[10px] text-green-500 font-bold uppercase tracking-widest mb-1 block">Subject Identity</label>
          <div className="flex items-center gap-2">
              <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleConfirmRename()}
                  placeholder="Subject name..."
                  className="bg-transparent text-3xl font-bold text-white focus:outline-none focus:text-green-400 transition-all border-b border-transparent focus:border-green-500/30 w-full"
              />
              
              <div className="flex items-center">
                  {hasNameChanged ? (
                      <button 
                        onClick={handleConfirmRename}
                        className="p-2 text-green-500 hover:text-green-400 transition-all scale-125 animate-pulse"
                        title="Confirm Name Change"
                      >
                          <CheckIcon className="w-6 h-6" />
                      </button>
                  ) : (
                      <button 
                          onClick={handleRerollName} 
                          disabled={isUpdatingName}
                          className="p-2 text-gray-600 hover:text-green-400 transition-colors disabled:opacity-30"
                          title="Neural Reroll Name"
                      >
                          <DiceIcon className={`w-6 h-6 ${isUpdatingName ? 'animate-spin' : ''}`} />
                      </button>
                  )}
              </div>
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={handleExport} disabled={isExporting} title="Export Forge Bundle (.zip)" className={`p-3 rounded-full border border-gray-700 text-gray-500 hover:border-green-500 hover:text-green-400 transition-all ${isExporting ? 'animate-pulse' : ''}`}>
                <ExportIcon className="w-5 h-5" />
            </button>
            <button onClick={playVoice} disabled={isPlayingVoice} title="Voice Synth" className={`p-3 rounded-full border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all ${isPlayingVoice ? 'animate-pulse scale-110 border-green-500' : ''}`}>
                <AudioIcon className="w-6 h-6" />
            </button>
        </div>
      </div>
      
      <div>
        <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Neural Traits</h4>
        <div className="flex flex-wrap gap-2">
            {details.personality.map((trait, i) => (
                <span key={i} className="bg-green-500/5 text-green-400 px-3 py-1 rounded-sm text-xs border border-green-500/20">{trait}</span>
            ))}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Origin Data</h4>
        <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{details.backstory}</p>
      </div>

      <div>
        <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Story Threads</h4>
        <ul className="space-y-3">
            {details.quests.map((quest, i) => (
                <li key={i} className="group border-l border-green-900/50 hover:border-green-500 pl-3 transition-all">
                    <h5 className="font-semibold text-green-500 text-sm">{quest.title}</h5>
                    <p className="text-gray-500 text-xs mt-1">{quest.description}</p>
                </li>
            ))}
        </ul>
      </div>

      <div className="pt-6 border-t border-gray-800 flex gap-3">
        <Button onClick={onRedo} variant="secondary" className="flex-1 text-[10px] uppercase">Re-Forge Visuals</Button>
        <Button onClick={handleExport} variant="primary" className="flex-1 text-[10px] uppercase">Export Bundle</Button>
      </div>
    </div>
  );
};