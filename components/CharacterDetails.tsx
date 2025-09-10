import React, { useState, useEffect } from 'react';
import type { CharacterData } from '../types';
import { Button } from './Button';
import JSZip from 'jszip';

interface CharacterDetailsProps {
  data: CharacterData;
  onRedo: () => void;
  onTweak: (newPrompt: string) => void;
  onEditName: (name: string) => void;
  onUpdateName: () => Promise<void>;
}

interface DetailSectionProps {
    title: string;
    children: React.ReactNode;
    delay: number;
}

const DiceIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r=".5" fill="currentColor"></circle>
      <circle cx="15.5" cy="8.5" r=".5" fill="currentColor"></circle>
      <circle cx="12" cy="12" r=".5" fill="currentColor"></circle>
      <circle cx="8.5" cy="15.5" r=".5" fill="currentColor"></circle>
      <circle cx="15.5" cy="15.5" r=".5" fill="currentColor"></circle>
    </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const DetailSection: React.FC<DetailSectionProps> = ({ title, children, delay }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);
    
    return (
        <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h3 className="text-xl font-bold text-green-400 border-b-2 border-green-500/30 pb-2 mb-3" style={{textShadow: '0 0 5px rgba(50,255,20,0.5)'}}>
                {title}
            </h3>
            {children}
        </div>
    );
};

export const CharacterDetails: React.FC<CharacterDetailsProps> = ({ data, onRedo, onTweak, onEditName, onUpdateName }) => {
  const [isTweaking, setIsTweaking] = useState(false);
  const [tweakPrompt, setTweakPrompt] = useState(data.prompt);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const details = data.details!;
  const images = data.images!;

  const handleTweakSubmit = () => {
    if (tweakPrompt.trim() && tweakPrompt !== data.prompt) {
      onTweak(tweakPrompt);
    }
    setIsTweaking(false);
  };

  const handleNameReroll = async () => {
    setIsGeneratingName(true);
    await onUpdateName();
    setIsGeneratingName(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();

      // Sanitize name for filename
      const sanitizedName = details.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      // Create a markdown summary
      let summary = `# ${details.name}\n\n`;
      summary += `**Original Prompt:** ${data.prompt}\n\n`;
      summary += `## Personality\n- ${details.personality.join('\n- ')}\n\n`;
      summary += `## Backstory\n${details.backstory}\n\n`;
      summary += `## Quest Arcs\n`;
      details.quests.forEach(q => {
        summary += `### ${q.title}\n${q.description}\n\n`;
      });

      zip.file("summary.md", summary);
      zip.file("details.json", JSON.stringify(details, null, 2));

      // Add images
      const imgFolder = zip.folder("images");
      if (imgFolder) {
        imgFolder.file("main_portrait.png", images.main, { base64: true });
        imgFolder.file("ortho_front.png", images.orthos.front, { base64: true });
        imgFolder.file("ortho_side.png", images.orthos.side, { base64: true });
        imgFolder.file("ortho_back.png", images.orthos.back, { base64: true });
        imgFolder.file("pose_1.png", images.poses[0], { base64: true });
        imgFolder.file("pose_2.png", images.poses[1], { base64: true });
      }

      // Generate zip and trigger download
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizedName}_character_package.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Failed to export character:", error);
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <DetailSection title="Name" delay={50}>
        <div className="flex items-center gap-3">
            <input
                type="text"
                value={details.name}
                onChange={(e) => onEditName(e.target.value)}
                className="flex-grow bg-black border border-gray-700 rounded-md p-2 text-lg text-green-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
                aria-label="Character Name"
            />
            <button
                onClick={handleNameReroll}
                disabled={isGeneratingName}
                className="p-2 rounded-md bg-green-500/10 border border-green-500 text-green-400 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="Generate new name"
            >
                <DiceIcon className={`w-6 h-6 ${isGeneratingName ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </DetailSection>
      
      <DetailSection title="Personality" delay={100}>
        <div className="flex flex-wrap gap-2">
            {details.personality.map((trait, i) => (
                <span key={i} className="bg-green-900/50 text-green-300 px-3 py-1 rounded-full text-sm font-medium border border-green-800">
                    {trait}
                </span>
            ))}
        </div>
      </DetailSection>

      <DetailSection title="Backstory" delay={300}>
        <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">{details.backstory}</p>
      </DetailSection>

      <DetailSection title="Quest Arcs" delay={500}>
        <ul className="space-y-4">
            {details.quests.map((quest, i) => (
                <li key={i}>
                    <h4 className="font-semibold text-green-500">{quest.title}</h4>
                    <p className="text-gray-400 text-sm">{quest.description}</p>
                </li>
            ))}
        </ul>
      </DetailSection>

      <div className="pt-6 border-t border-gray-800 flex flex-col sm:flex-row gap-4 flex-wrap">
        <Button onClick={onRedo} variant="secondary">Rerun Original Prompt</Button>
        <Button onClick={() => setIsTweaking(!isTweaking)} variant="secondary">
          {isTweaking ? 'Cancel Tweak' : 'Adjust Prompt'}
        </Button>
        <Button onClick={handleExport} disabled={isExporting} variant="primary">
          {isExporting ? (
            'Packaging...'
          ) : (
            <span className="flex items-center gap-2">
              <DownloadIcon className="w-5 h-5" />
              Export Character
            </span>
          )}
        </Button>
      </div>

      {isTweaking && (
        <div className="p-4 bg-gray-800/50 rounded-md">
            <textarea
                className="w-full bg-black border border-gray-700 rounded-md p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300"
                value={tweakPrompt}
                onChange={(e) => setTweakPrompt(e.target.value)}
                rows={3}
            />
            <div className="mt-2 text-right">
                <Button onClick={handleTweakSubmit}>Regenerate</Button>
            </div>
        </div>
      )}
    </div>
  );
};