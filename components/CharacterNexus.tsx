import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CharacterData, ChatMessage, InteractiveState, Gift, CharacterDetails, ImagePart } from '../types'; // Import ImagePart
import { getCharacterChatResponse, generateCharacterSpeech, decodeAudioData } from '../services/geminiService';
import { Button } from './Button';

interface CharacterNexusProps {
  data: CharacterData;
  onUpdateInteractiveState: (newState: Partial<InteractiveState>) => void;
  // Prop definition now matches service function: (baseImage, characterDetails, costumePrompt)
  onGenerateCostume: (baseImage: ImagePart, characterDetails: CharacterDetails, costumePrompt: string) => Promise<ImagePart>; // Changed to ImagePart for baseImage and return type
  onNewCostumeUnlocked: (costumeImagePart: ImagePart) => void; // Changed to ImagePart
}

const AVAILABLE_GIFTS: Gift[] = [
    { id: '1', name: 'Glimmer Shard', description: 'A small, sparkling crystal that brightens any mood.', cost: 10, effect: 15 },
    { id: '2', name: 'Dreamweave Brooch', description: 'A finely crafted brooch that hints at shared futures.', cost: 25, effect: 30 },
    { id: '3', name: 'Echo Bloom', description: 'A rare flower said to reflect one\'s deepest desires.', cost: 50, effect: 50 },
    { id: '4', name: 'Celestial Key', description: 'An artifact that unlocks ancient pathways and forgotten bonds.', cost: 100, effect: 100 },
];

export const CharacterNexus: React.FC<CharacterNexusProps> = ({ data, onUpdateInteractiveState, onGenerateCostume, onNewCostumeUnlocked }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(data.interactiveState?.chatHistory || []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [resonance, setResonance] = useState(data.interactiveState?.resonance || 0);
  const [nexusCredits, setNexusCredits] = useState(data.interactiveState?.nexusCredits || 0);
  const [inventory, setInventory] = useState<Gift[]>(data.interactiveState?.inventory || []);
  const [memoryBank, setMemoryBank] = useState<string[]>(data.interactiveState?.memoryBank || []);
  const [currentEmotion, setCurrentEmotion] = useState<'neutral' | 'happy' | 'angry' | 'thoughtful'>('neutral');
  const [isGeneratingCostume, setIsGeneratingCostume] = useState(false);
  const [currentCostumeIndex, setCurrentCostumeIndex] = useState<number | null>(null); // null for default, index for costumes array
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Sync internal state with parent on changes
  useEffect(() => {
    onUpdateInteractiveState({ resonance, nexusCredits, inventory, memoryBank, chatHistory: messages });
  }, [resonance, nexusCredits, inventory, memoryBank, messages, onUpdateInteractiveState]);

  useEffect(() => {
    setMessages(data.interactiveState?.chatHistory || []);
    setResonance(data.interactiveState?.resonance || 0);
    setNexusCredits(data.interactiveState?.nexusCredits || 0);
    setInventory(data.interactiveState?.inventory || []);
    setMemoryBank(data.interactiveState?.memoryBank || []);
    // Reset currentCostumeIndex if characterData changes to a new character
    if (!data.images?.costumes || data.images.costumes.length === 0) {
      setCurrentCostumeIndex(null);
    }
  }, [data.interactiveState, data.images?.costumes]);


  const scrollToBottom = () => {
    if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  useEffect(scrollToBottom, [messages, isTyping]);

  const stopCurrentAudio = () => {
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch (e) {}
      activeSourceRef.current = null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input;
    setInput('');
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    // Add user input to memory bank
    setMemoryBank(prev => [...prev.slice(-9), `User: ${userMsg}`]); // Keep last 10 entries

    setIsTyping(true);

    try {
      const response = await getCharacterChatResponse(messages, userMsg, data.details!, memoryBank);
      const emotion = (response.emotion?.toLowerCase() as any) || 'neutral';
      
      let simpleEmotion: 'neutral' | 'happy' | 'angry' | 'thoughtful' = 'neutral';
      if (emotion.includes('happy') || emotion.includes('laugh') || emotion.includes('joy') || emotion.includes('smile')) simpleEmotion = 'happy';
      else if (emotion.includes('angry') || emotion.includes('rage') || emotion.includes('aggressive')) simpleEmotion = 'angry';
      else if (emotion.includes('think') || emotion.includes('ponder') || emotion.includes('thoughtful')) simpleEmotion = 'thoughtful';

      // Update resonance points and award credits
      if (response.resonanceChange) {
          const newResonance = Math.min(100, Math.max(0, resonance + response.resonanceChange));
          const resonanceGained = newResonance - resonance;
          const creditsAwarded = Math.floor(resonanceGained / 10); // 1 credit per 10 resonance gained
          
          setResonance(newResonance);
          setNexusCredits(prev => prev + creditsAwarded);
      }

      setCurrentEmotion(simpleEmotion);
      setMessages(prev => [...prev, { role: 'model', text: response.text, emotion: simpleEmotion }]);
      // Add model response to memory bank
      setMemoryBank(prev => [...prev.slice(-9), `${data.details?.name || 'Character'}: ${response.text}`]); // Keep last 10 entries


      if (autoSpeak) {
        stopCurrentAudio();
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        try {
            const audioBytes = await generateCharacterSpeech(response.text, data.details!.voicePrompt);
            const buffer = await decodeAudioData(audioBytes, audioCtxRef.current, 24000, 1);
            
            const source = audioCtxRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtxRef.current.destination);
            activeSourceRef.current = source;
            
            source.onended = () => {
              if (activeSourceRef.current === source) activeSourceRef.current = null;
              setTimeout(() => setCurrentEmotion('neutral'), 1500);
            };
            source.start();
        } catch (audioErr) {
            console.error("Speech generation failed", audioErr);
            setTimeout(() => setCurrentEmotion('neutral'), 3000);
        }
      } else {
        setTimeout(() => setCurrentEmotion('neutral'), 3000);
      }
    } catch (e) {
      console.error("Nexus handling error:", e);
      setMessages(prev => [...prev, { role: 'model', text: "Neural link interference detected. Please re-attempt signal.", emotion: 'thoughtful' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleBuyGift = useCallback((gift: Gift) => {
    if (nexusCredits >= gift.cost) {
        setNexusCredits(prev => prev - gift.cost);
        setInventory(prev => [...prev, gift]);
        setMessages(prev => [...prev, { role: 'user', text: `You bought a ${gift.name}.` }]);
    }
  }, [nexusCredits]);

  const handleUseGift = useCallback(async (gift: Gift) => {
    setInventory(prev => prev.filter(item => item.id !== gift.id));
    setMessages(prev => [...prev, { role: 'user', text: `You offered the ${gift.name} to ${data.details?.name}.` }]);
    
    // Simulate character response to gift and resonance boost
    const newResonance = Math.min(100, Math.max(0, resonance + gift.effect));
    setResonance(newResonance);
    setCurrentEmotion('happy'); // Character will be happy about the gift

    const giftResponseText = `${data.details?.name} gratefully accepts the ${gift.name}! "Thank you, this is truly wonderful."`;
    setMessages(prev => [...prev, { role: 'model', text: giftResponseText, emotion: 'happy' }]);
    setMemoryBank(prev => [...prev.slice(-9), `User gave ${gift.name}. ${data.details?.name} responded: ${giftResponseText}`]);
    
    if (autoSpeak) {
        stopCurrentAudio();
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        try {
            const audioBytes = await generateCharacterSpeech(giftResponseText, data.details!.voicePrompt);
            const buffer = await decodeAudioData(audioBytes, audioCtxRef.current, 24000, 1);
            const source = audioCtxRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtxRef.current.destination);
            activeSourceRef.current = source;
            source.onended = () => {
              if (activeSourceRef.current === source) activeSourceRef.current = null;
              setTimeout(() => setCurrentEmotion('neutral'), 1500);
            };
            source.start();
        } catch (audioErr) {
            console.error("Speech generation for gift failed", audioErr);
            setTimeout(() => setCurrentEmotion('neutral'), 3000);
        }
    } else {
        setTimeout(() => setCurrentEmotion('neutral'), 3000);
    }

  }, [resonance, inventory, data.details, autoSpeak, memoryBank, messages]);

  const handleUnlockCostume = async (costumeType: string) => {
    if (!data.details || !data.images?.main || isGeneratingCostume) return;
    setIsGeneratingCostume(true);
    setCurrentCostumeIndex(null); // Go to neutral pose while generating
    try {
      const newCostumeImage = await onGenerateCostume(
        data.images.main, // Correct argument order: baseImage (ImagePart)
        data.details,     // Correct argument order: characterDetails
        costumeType
      );
      onNewCostumeUnlocked(newCostumeImage);
      // Immediately set the newly generated costume as active
      setCurrentCostumeIndex(data.images.costumes ? data.images.costumes.length : 0);
    } catch (error) {
      console.error("Failed to generate costume:", error);
      // Optionally display an error message to the user
    } finally {
      setIsGeneratingCostume(false);
    }
  };

  const getDisplayImage = (): ImagePart => { // Return type is ImagePart
    // If a costume is selected, display it
    if (currentCostumeIndex !== null && data.images?.costumes && data.images.costumes[currentCostumeIndex]) {
      return data.images.costumes[currentCostumeIndex];
    }
    // Otherwise, fall back to emotion-based poses
    if (!data.images?.poses) return data.images?.main; // data.images.main is already an ImagePart
    const poses = data.images.poses;
    switch(currentEmotion) {
        case 'happy': return poses[1] || poses[0];
        case 'angry': return poses[2] || poses[0];
        case 'thoughtful': return poses[3] || poses[0];
        default: return poses[0] || data.images.main;
    }
  };

  const currentDisplayImagePart = getDisplayImage(); // Get the ImagePart object
  const imageUrl = currentDisplayImagePart.data.startsWith('http') 
    ? currentDisplayImagePart.data 
    : `data:${currentDisplayImagePart.mimeType};base64,${currentDisplayImagePart.data}`;

  const getResonanceLabel = () => {
      if (resonance < 10) return "Stranger";
      if (resonance < 30) return "Acquaintance";
      if (resonance < 60) return "Ally";
      if (resonance < 90) return "Confidant";
      return "Soulbound";
  };

  const isConfidant = resonance >= 60; // For unlocking features

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[750px] animate-fadeIn">
      <style>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        .animate-shake { animation: shake 0.4s infinite; }
      `}</style>
      
      <div className="lg:w-1/2 relative bg-black rounded-2xl border border-gray-800 overflow-hidden shadow-2xl flex items-center justify-center p-6">
        <div className="w-full h-full relative">
            {isGeneratingCostume && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10">
                    <div className="w-16 h-16 border-4 border-dashed border-green-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-lg font-semibold text-green-400" style={{ textShadow: '0 0 5px #39FF14' }}>
                        Synthesizing Attire...
                    </p>
                </div>
            )}
            <img 
              key={currentCostumeIndex !== null ? `costume-${currentCostumeIndex}` : currentEmotion}
              src={imageUrl} 
              alt="Character Portrait" 
              className={`w-full h-full object-contain transition-all duration-300 ease-out ${
                currentEmotion === 'angry' ? 'animate-shake' : currentEmotion === 'happy' ? 'scale-105' : 'scale-100'
              }`}
            />
        </div>
        <div className="absolute top-6 inset-x-0 px-8">
            <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Neural Resonance</span>
                <span className="text-[10px] text-gray-400 font-mono uppercase">{getResonanceLabel()} ({resonance}%)</span>
            </div>
            <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                <div 
                    className="h-full bg-green-500 transition-all duration-1000 shadow-[0_0_10px_#39FF14]" 
                    style={{ width: `${resonance}%` }}
                ></div>
            </div>
        </div>
        <div className="absolute bottom-8 inset-x-0 flex justify-center">
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-6 py-2 rounded-full border bg-black/80 transition-all duration-500 ${
              currentEmotion !== 'neutral' ? 'text-green-400 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'text-gray-500 border-gray-800'
            }`}>
                Neural Synapse: {currentEmotion}
            </span>
        </div>
      </div>

      <div className="lg:w-1/2 flex flex-col bg-gray-900/40 rounded-2xl border border-gray-800 p-6 backdrop-blur-xl">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800/50 pb-4">
            <h3 className="text-green-400 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <span className={`w-2 h-2 bg-green-500 rounded-full ${isTyping ? 'animate-ping' : ''}`}></span>
                {data.details?.name || 'Subject'}
            </h3>
            <div className="flex gap-2 items-center">
                <div className="text-xs text-green-500 font-bold uppercase tracking-widest flex items-center gap-1 bg-black/40 px-3 py-1 rounded border border-green-700">
                    <span className="text-sm">◎</span> {nexusCredits}
                </div>
                
                {/* Costume Controls */}
                <select 
                  className="px-3 py-1 bg-black/40 rounded border border-gray-800 text-[9px] text-gray-400 uppercase font-bold transition-colors hover:border-green-500/50"
                  value={currentCostumeIndex === null ? 'default' : currentCostumeIndex}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentCostumeIndex(val === 'default' ? null : parseInt(val));
                  }}
                  title="Select Character Attire"
                >
                  <option value="default">Default Attire</option>
                  {data.images?.costumes?.map((_, idx) => (
                    <option key={`costume-option-${idx}`} value={idx}>
                      Costume {idx + 1}
                    </option>
                  ))}
                </select>

                <button 
                  onClick={() => handleUnlockCostume('seductive bunny maid outfit')} // For testing, hardcode costume type
                  disabled={isGeneratingCostume} // Disable while generating
                  className={`px-3 py-1 bg-black/40 rounded border text-[9px] uppercase font-bold transition-all ${isGeneratingCostume ? 'border-gray-800 text-gray-600 cursor-wait' : 'border-green-500/50 text-green-400 hover:bg-green-500/10'}`}
                  title="Generate a new seductive costume for the character (for testing, no points needed yet)"
                >
                    {isGeneratingCostume ? 'Synthesizing...' : 'Unlock Costume'}
                </button>
                <label className="flex items-center gap-2 cursor-pointer group bg-black/40 px-3 py-1 rounded border border-gray-800 hover:border-green-500/50 transition-colors">
                    <span className="text-[9px] text-gray-500 group-hover:text-green-400 uppercase font-bold">Voice</span>
                    <input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)} className="w-3 h-3 accent-green-500 cursor-pointer" />
                </label>
            </div>
        </div>

        {/* Gift Matrix */}
        <div className="mb-6 pb-4 border-b border-gray-800/50">
            <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-3">Gift Matrix</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AVAILABLE_GIFTS.map(gift => (
                    <div key={gift.id} className="relative p-2 bg-black/30 rounded-md border border-gray-800 flex flex-col justify-between items-center text-center">
                        <h5 className="text-xs text-green-400 font-semibold">{gift.name}</h5>
                        <p className="text-[8px] text-gray-500 mt-1 mb-2">{gift.description}</p>
                        {inventory.some(item => item.id === gift.id) ? (
                            <Button 
                                onClick={() => handleUseGift(gift)}
                                variant="secondary"
                                className="w-full text-[9px] py-1 px-2"
                            >
                                Use ({gift.effect} Res)
                            </Button>
                        ) : (
                            <Button 
                                onClick={() => handleBuyGift(gift)}
                                disabled={nexusCredits < gift.cost}
                                className="w-full text-[9px] py-1 px-2"
                            >
                                Buy (◎{gift.cost})
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
        
        {/* Chat History */}
        <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-900/40">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                    <p className="text-xs font-mono uppercase tracking-[0.3em] mb-2">Biometric Link Established</p>
                    <p className="text-[10px] text-gray-500 italic">Initiate neural dialogue to build resonance</p>
                </div>
            )}
            {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                    <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                        m.role === 'user' ? 'bg-green-500/10 border border-green-500/30 text-green-50 shadow-sm' : 'bg-gray-800/80 border border-gray-700/50 text-gray-200'
                    }`}>
                        {m.text}
                    </div>
                </div>
            ))}
            {isTyping && <div className="text-[10px] text-green-500/50 uppercase font-mono animate-pulse tracking-[0.2em] ml-2">Synaptic Processing...</div>}
            <div ref={chatEndRef} />
        </div>

        <div className="relative">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Inject neural sequence..."
              className="w-full bg-black/60 border border-gray-800 rounded-xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:border-green-500 font-mono transition-all placeholder:text-gray-700"
            />
            <button onClick={handleSend} disabled={!input.trim() || isTyping} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-green-500 hover:text-green-400 disabled:text-gray-800 transition-colors">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </button>
        </div>
      </div>
    </div>
  );
};