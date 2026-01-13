
import React, { useState, useRef, useEffect } from 'react';
import type { CharacterData, ChatMessage, InteractiveState, ImagePart, CharacterDetails as CharacterDetailsType, RelationshipLevel } from '../types';
import { getCharacterChatResponse, generateCharacterSpeech, decodeAudioData, generateModifiedImage, generateRenamedProfile, generateRandomName } from '../services/geminiService';
import { CharacterDetails } from './CharacterDetails';
import JSZip from 'jszip';

interface CharacterNexusProps {
  data: CharacterData;
  onUpdateInteractiveState: (newState: Partial<InteractiveState>) => void;
  onNewCostumeUnlocked: (costumeImagePart: ImagePart) => void;
  onImportCharacter: (file: File) => Promise<void>;
  onGenerateConcepts: (prompt: string) => void;
  onUpdateCharacterDetails: (newDetails: Partial<CharacterDetailsType>) => void;
}

const ENVIRONMENTS = ['Original', 'Luxury Suite', 'Private Bedroom', 'Moonlight Beach', 'Neon Rooftop'];
const COSTUMES = ['Classic Anime', 'Seductive Bunny', 'Latex Bodysuit', 'Silk Lingerie', 'String Bikini'];

export const CharacterNexus: React.FC<CharacterNexusProps> = ({ 
  data, 
  onUpdateInteractiveState, 
  onNewCostumeUnlocked,
  onUpdateCharacterDetails,
}) => {
  if (!data.details || !data.images) return null;

  const [messages, setMessages] = useState<ChatMessage[]>(data.interactiveState?.chatHistory || []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [affinity, setAffinity] = useState(data.interactiveState?.affinityScore || 0);
  const [credits, setCredits] = useState(data.interactiveState?.nexusCredits || 100);
  const [removedItems, setRemovedItems] = useState<string[]>(data.interactiveState?.removedApparel || []);
  const [environment, setEnvironment] = useState(data.interactiveState?.currentEnvironment || 'Original');
  const [isTtsEnabled, setIsTtsEnabled] = useState(data.interactiveState?.isTtsEnabled ?? true);
  
  const [currentDisplayImage, setCurrentDisplayImage] = useState<ImagePart>(data.images.main);
  const [stickyImage, setStickyImage] = useState<ImagePart | null>(null);
  const emotionResetTimer = useRef<any>(null);

  const [view, setView] = useState<'chat' | 'bio' | 'games'>('chat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newNameInput, setNewNameInput] = useState(data.details.name);

  const sessionStarted = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getRelationship = (ap: number): RelationshipLevel => {
    if (ap > 1000) return 'Soulmate';
    if (ap > 600) return 'Intimate';
    if (ap > 300) return 'Companion';
    if (ap > 100) return 'Acquaintance';
    return 'Stranger';
  };

  const relLevel = getRelationship(affinity);

  useEffect(() => {
    if (sessionStarted.current) {
      onUpdateInteractiveState({ 
        affinityScore: affinity, 
        nexusCredits: credits, 
        relationshipLevel: relLevel, 
        removedApparel: removedItems,
        currentEnvironment: environment,
        isTtsEnabled,
        chatHistory: messages 
      });
    }
    sessionStarted.current = true;
  }, [affinity, credits, removedItems, environment, isTtsEnabled, messages, relLevel, onUpdateInteractiveState]);

  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, isTyping]);

  useEffect(() => {
      if (view === 'chat') {
          setStickyImage(null);
      }
  }, [view]);

  const handleSend = async (customMsg?: string) => {
    const text = customMsg || input;
    if (!text.trim() || isTyping || isProcessing) return;
    
    // Auto-switch to chat if a game was selected or interaction launched
    if (view !== 'chat') setView('chat');
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsTyping(true);

    try {
      const response = await getCharacterChatResponse(messages, text, data.details!, [], relLevel, affinity);
      setAffinity(prev => prev + response.affinityGain);
      setCredits(prev => prev + response.creditsGain);
      
      const poses = data.images!.poses;
      const poseMap: any = { happy: poses[1], angry: poses[2], thoughtful: poses[3], neutral: poses[0] };
      
      if (!stickyImage) {
          const emotionalPose = poseMap[response.emotion] || poses[0];
          setCurrentDisplayImage(emotionalPose);
          if (emotionResetTimer.current) clearTimeout(emotionResetTimer.current);
          emotionResetTimer.current = setTimeout(() => {
              setCurrentDisplayImage(poses[0]);
          }, 8000);
      }

      setMessages(prev => [...prev, { role: 'model', text: response.text, emotion: response.emotion as any }]);

      if (isTtsEnabled) {
          audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
          const audioBytes = await generateCharacterSpeech(response.text, data.details!.voicePrompt);
          const buffer = await decodeAudioData(audioBytes, audioCtxRef.current);
          const source = audioCtxRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtxRef.current.destination);
          source.start();
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Neural flux detected... retrying.", emotion: 'thoughtful' }]);
    } finally { setIsTyping(false); }
  };

  const handleStartQuest = (title: string, desc: string) => {
      handleSend(`Let's play the quest: "${title}". Description: ${desc}. Please act as the Game Master and start the scenario for me. Give me choices!`);
  };

  const handleModify = async (newRemoved?: string[], newEnv?: string, costume?: string) => {
    const items = newRemoved || removedItems;
    const env = newEnv || environment;
    const isTestMode = credits > 5000;
    
    if (!isTestMode) {
        const levels: RelationshipLevel[] = ['Stranger', 'Acquaintance', 'Companion', 'Intimate', 'Soulmate'];
        if (levels.indexOf(relLevel) < 2 && items.length > 2) {
            window.alert("Connection depth insufficient for modification.");
            return;
        }
        if (credits < 30) return;
    }

    setIsProcessing(true);
    try {
      const newImg = await generateModifiedImage(data.images!.original || data.images!.main, items, env, costume);
      onNewCostumeUnlocked(newImg); 
      if (newRemoved) setRemovedItems(newRemoved);
      if (newEnv) setEnvironment(newEnv);
      if (!isTestMode) setCredits(prev => prev - 30);
      setCurrentDisplayImage(newImg); 
    } catch (e) { 
        window.alert("Neural synthesis failed."); 
    } finally { setIsProcessing(false); }
  };

  const handleExportBundle = async () => {
    setIsProcessing(true);
    try {
        const zip = new JSZip();
        const saveState: CharacterData = {
            ...data,
            interactiveState: {
                resonance: 0,
                nexusCredits: credits,
                affinityScore: affinity,
                relationshipLevel: relLevel,
                removedApparel: removedItems,
                currentEnvironment: environment,
                memoryBank: messages.map(m => m.text).slice(-10),
                chatHistory: messages,
                armorLevel: 0,
                isTtsEnabled
            }
        };

        zip.file("manifest.json", JSON.stringify(saveState, null, 2));
        zip.file("current_nexus.png", currentDisplayImage.data, {base64: true});

        const content = await zip.generateAsync({type:"blob"});
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.details!.name.replace(/\s+/g, '_')}_Neural_Bundle.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (e) {
        window.alert("Export failed.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRenameSubmit = async () => {
    if (!newNameInput.trim() || newNameInput === data.details!.name) {
        setIsRenaming(false);
        return;
    }
    setIsProcessing(true);
    try {
        const updatedProfile = await generateRenamedProfile(data.details!, newNameInput);
        onUpdateCharacterDetails(updatedProfile);
        setIsRenaming(false);
    } catch (e) {
        window.alert("Renaming failed.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRandomRename = async () => {
      setIsProcessing(true);
      try {
          const randomName = await generateRandomName(data.details!);
          const updatedProfile = await generateRenamedProfile(data.details!, randomName);
          onUpdateCharacterDetails(updatedProfile);
          setNewNameInput(randomName);
      } catch (e) {
          window.alert("Random rename failed.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleGallerySelect = (img: ImagePart) => {
      setStickyImage(img);
      setCurrentDisplayImage(img);
  };

  const enableTestMode = () => {
    setCredits(9999);
    setAffinity(1200);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[850px] animate-fadeIn">
      {/* Portrait Terminal */}
      <div className="lg:w-1/2 relative bg-black rounded-2xl border border-gray-800 overflow-hidden shadow-2xl flex items-center justify-center p-4">
        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-500 border-t-transparent"></div>
                <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Processing Neural Stream...</span>
            </div>
          </div>
        )}
        <img src={`data:${currentDisplayImage.mimeType};base64,${currentDisplayImage.data}`} alt="Nexus" className="w-full h-full object-contain" />
        
        <div className="absolute top-4 inset-x-6 space-y-1">
            <div className="flex justify-between items-end">
                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">{relLevel}</span>
                <span className="text-[9px] text-gray-500 font-mono">{affinity} AP</span>
            </div>
            <div className="w-full h-1.5 bg-gray-900 rounded-full border border-gray-800 overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-1000 shadow-[0_0_10px_#22c55e]" style={{ width: `${Math.min(100, (affinity % 250) / 2.5)}%` }}></div>
            </div>
        </div>

        <div className="absolute bottom-4 left-6 flex items-center gap-2">
            <button onClick={enableTestMode} className="bg-black/60 backdrop-blur-md border border-green-500/20 px-3 py-1.5 rounded-full text-[10px] text-green-400 font-bold tracking-widest hover:bg-green-500/10 transition-colors">
                ◎ {credits}
            </button>
        </div>
      </div>

      {/* Interface Terminal */}
      <div className="lg:w-1/2 flex flex-col bg-gray-900/10 backdrop-blur-sm rounded-2xl border border-gray-800 p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800/50 pb-4">
            <div className="flex gap-4">
                {['chat', 'bio', 'games'].map(t => (
                    <button key={t} onClick={() => setView(t as any)} className={`text-xs font-bold uppercase tracking-widest transition-all ${view === t ? 'text-green-400 border-b-2 border-green-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}>{t}</button>
                ))}
            </div>
            <div className="flex flex-col items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <span className="text-[9px] font-bold text-gray-500 uppercase group-hover:text-green-500 transition-colors">Neural Voice</span>
                    <input type="checkbox" checked={isTtsEnabled} onChange={e => setIsTtsEnabled(e.target.checked)} className="accent-green-500" />
                </label>
                <button 
                    onClick={handleExportBundle}
                    className="flex items-center gap-2 text-[9px] font-bold text-green-500/70 hover:text-green-400 uppercase tracking-widest transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export Bundle
                </button>
            </div>
        </div>

        {view === 'chat' && (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="mb-4 flex justify-between items-start">
                    <div className="flex-grow">
                        {isRenaming ? (
                            <div className="flex gap-2">
                                <input 
                                    autoFocus
                                    className="bg-black border-b border-green-500/50 text-2xl font-bold text-white uppercase outline-none font-orbitron w-full" 
                                    value={newNameInput} 
                                    onChange={e => setNewNameInput(e.target.value)}
                                    onBlur={handleRenameSubmit}
                                    onKeyPress={e => e.key === 'Enter' && handleRenameSubmit()}
                                />
                                <button onClick={handleRandomRename} className="text-gray-500 hover:text-green-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.5 11M20 20l-1.5-1.5A9 9 0 003.5 13" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-bold text-white tracking-widest uppercase font-orbitron">{data.details.name}</h2>
                                <button onClick={() => setIsRenaming(true)} className="text-gray-600 hover:text-green-500 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                            </div>
                        )}
                        <p className="text-[9px] text-green-600 uppercase font-mono tracking-widest mt-1">Active Link // Seductive Mode</p>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-hide">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${m.role === 'user' ? 'bg-green-500/10 border border-green-500/20 text-green-50' : 'bg-gray-800/90 text-gray-200 shadow-lg'}`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && <div className="text-[10px] text-green-500 font-mono animate-pulse uppercase tracking-widest">Transmitting...</div>}
                    <div ref={chatEndRef} />
                </div>
                
                <div className="space-y-4 pt-4 border-t border-gray-800/50">
                    <div className="flex gap-2">
                        <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Sync thought stream..." className="flex-grow bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-green-500/40 outline-none transition-all" />
                        <button onClick={() => handleSend()} className="bg-green-500/10 border border-green-500/30 text-green-400 px-5 rounded-xl hover:bg-green-500/30 transition-all">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {view === 'bio' && (
            <div className="flex flex-col h-full overflow-hidden">
                <CharacterDetails 
                    data={data} 
                    onUpdateCharacterDetails={onUpdateCharacterDetails} 
                    settings={null as any} 
                    onReset={() => window.location.reload()} 
                    selectedPose={currentDisplayImage} 
                    onSelectImage={handleGallerySelect} 
                    onStartQuest={handleStartQuest}
                />
                
                <div className="mt-6 pt-4 border-t border-gray-800 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-4">
                    <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Neural Synthesis Controls</h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-3">
                            <div>
                                <label className="text-[9px] text-gray-600 font-bold uppercase mb-1 block">Apparel Modification</label>
                                <select 
                                    onChange={(e) => {
                                        const item = e.target.value;
                                        if(!item) return;
                                        const next = removedItems.includes(item) ? removedItems.filter(i => i !== item) : [...removedItems, item];
                                        handleModify(next);
                                    }}
                                    className="w-full bg-black/60 border border-gray-800 text-[10px] font-bold text-green-400 rounded p-2 outline-none cursor-pointer appearance-none"
                                >
                                    <option value="">Modify Apparel...</option>
                                    {data.details.baseApparel.map(item => (
                                        <option key={item} value={item}>
                                            {removedItems.includes(item) ? `[Restore] ${item}` : `[Remove] ${item}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-600 font-bold uppercase mb-1 block">Environment Sync</label>
                                <select 
                                    onChange={(e) => handleModify(undefined, e.target.value)} 
                                    value={environment}
                                    className="w-full bg-black/60 border border-gray-800 text-[10px] font-bold text-green-400 rounded p-2 outline-none cursor-pointer"
                                >
                                    {ENVIRONMENTS.map(env => <option key={env} value={env}>{env}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-600 font-bold uppercase mb-1 block">Costume Synthesis (50◎)</label>
                                <select 
                                    onChange={(e) => e.target.value && handleModify(undefined, undefined, e.target.value)}
                                    className="w-full bg-black/60 border border-gray-800 text-[10px] font-bold text-green-400 rounded p-2 outline-none cursor-pointer appearance-none"
                                >
                                    <option value="">Select New Style...</option>
                                    {COSTUMES.map(style => <option key={style} value={style}>{style}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {view === 'games' && (
            <div className="flex flex-col gap-6 py-4 overflow-y-auto pr-2 scrollbar-hide">
                <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-2xl">
                    <h3 className="text-green-400 font-bold uppercase text-xs mb-1 tracking-widest">Narrative Challenges</h3>
                    <p className="text-gray-500 text-[10px] leading-relaxed">Launch immersive scenarios based on {data.details.name}'s life.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    {data.details.quests.map((quest, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleStartQuest(quest.title, quest.description)}
                            className="p-6 text-left border border-gray-800 rounded-2xl hover:border-green-500/40 group transition-all bg-gray-900/40 relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-white font-bold mb-1 group-hover:text-green-400 uppercase tracking-widest text-sm">{quest.title}</h4>
                                    <p className="text-[10px] text-gray-500 leading-tight pr-4">{quest.description}</p>
                                </div>
                                <div className="text-[8px] font-bold text-green-600 border border-green-900/50 px-2 py-0.5 rounded">QUEST NODE</div>
                            </div>
                        </button>
                    ))}
                    
                    <div className="pt-4 border-t border-gray-800 mt-2">
                        <label className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mb-3 block">Neural Training</label>
                        <button onClick={() => handleSend(`Initiate Quiz: Test my knowledge on your lore.`)} className="w-full p-4 text-left border border-gray-800 rounded-xl hover:border-green-500/40 group transition-all bg-black/20 mb-3">
                            <h4 className="text-xs font-bold text-gray-300 group-hover:text-green-400 uppercase tracking-tighter">Lore Evaluation</h4>
                            <p className="text-[9px] text-gray-600">Answer 3 questions about her origins. (+50 AP)</p>
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
