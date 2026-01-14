
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import type { CharacterData, ChatMessage, InteractiveState, ImagePart, CharacterDetails as CharacterDetailsType, RelationshipLevel, Reward, InventoryItem, BehaviorStats } from '../types';
import { getCharacterChatResponse, generateCharacterSpeech, decodeAudioData, generateModifiedImage, generateRenamedProfile, generateRandomName, generateNewQuest, generateRewardImage, generateIdlePing, decode, encode } from '../services/geminiService';
import { CharacterDetails } from './CharacterDetails';
import JSZip from 'jszip';

interface CharacterNexusProps {
  data: CharacterData;
  onUpdateInteractiveState: (newState: Partial<InteractiveState>) => void;
  onNewCostumeUnlocked: (costumeImagePart: ImagePart) => void;
  onImportCharacter: (file: File) => Promise<void>;
  onGenerateConcepts: (prompt: string) => void;
  // Use CharacterDetailsType to avoid collision with CharacterDetails component
  onUpdateCharacterDetails: (newDetails: Partial<CharacterDetailsType>) => void;
}

const ENVIRONMENTS = ['Original', 'Luxury Suite', 'Private Bedroom', 'Moonlight Beach', 'Neon Rooftop'];
const COSTUMES = ['Classic Anime', 'Seductive Bunny', 'Latex Bodysuit', 'Silk Lingerie', 'String Bikini'];

const SHOP_ITEMS: InventoryItem[] = [
    { id: 'rose', name: 'Synthesized Rose', icon: '◈', description: 'A digital bloom. Significant affinity boost.', cost: 300, type: 'gift', statImpact: { affinity: 25, mood: 15 } },
    { id: 'drink', name: 'Neural Energy', icon: '☇', description: 'Instantly restores companion energy.', cost: 80, type: 'consumable', statImpact: { energy: 40, mood: 5 } },
    { id: 'chocolate', name: 'Bit-Chocolate', icon: '▣', description: 'Sweet treats for the neural link. Restores hunger.', cost: 120, type: 'consumable', statImpact: { hunger: 40, mood: 10 } },
    { id: 'choker', name: 'Lace Choker', icon: '⚭', description: 'A wearable gift. Boosts intimacy.', cost: 500, type: 'gift', statImpact: { affinity: 50, mood: 20 } },
];

const DiceIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
);

const UnifiedStatIndicator: React.FC<{ icon: string, value: number, label: string, colorClass?: string }> = ({ icon, value, label, colorClass = "bg-green-500/60" }) => (
    <div className="flex flex-col gap-1 flex-1">
        <div className="flex justify-between items-center px-1">
            <span className="text-[7px] font-bold text-gray-500 uppercase tracking-tighter flex items-center gap-1">
                <span className="text-green-500/80">{icon}</span> {label}
            </span>
            <span className="text-[7px] font-mono text-green-500/80">{Math.round(value)}%</span>
        </div>
        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
            <div className={`h-full transition-all duration-700 ${colorClass}`} style={{ width: `${value}%` }} />
        </div>
    </div>
);

const AccordionItem: React.FC<{ title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, isOpen, onToggle, children }) => (
    <div className="border border-gray-800 rounded-xl overflow-hidden mb-3 bg-black/20">
        <button 
            onClick={onToggle}
            className="w-full flex justify-between items-center p-4 hover:bg-green-500/5 transition-all text-left"
        >
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{title}</span>
            <span className={`text-green-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
        </button>
        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 p-4 border-t border-gray-800' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            {children}
        </div>
    </div>
);

export const CharacterNexus: React.FC<CharacterNexusProps> = ({ data, onUpdateInteractiveState, onNewCostumeUnlocked, onUpdateCharacterDetails }) => {
  if (!data.details || !data.images) return null;

  const [messages, setMessages] = useState<ChatMessage[]>(data.interactiveState?.chatHistory || []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [affinity, setAffinity] = useState(data.interactiveState?.affinityScore || 0);
  const [credits, setCredits] = useState(data.interactiveState?.nexusCredits || 100);
  const [removedItems, setRemovedItems] = useState<string[]>(data.interactiveState?.removedApparel || []);
  const [environment, setEnvironment] = useState(data.interactiveState?.currentEnvironment || 'Original');
  const [isTtsEnabled, setIsTtsEnabled] = useState(data.interactiveState?.isTtsEnabled ?? true);
  const [hunger, setHunger] = useState(data.interactiveState?.hunger ?? 50);
  const [energy, setEnergy] = useState(data.interactiveState?.energy ?? 50);
  const [mood, setMood] = useState(data.interactiveState?.mood ?? 50);
  const [rewards, setRewards] = useState<Reward[]>(data.interactiveState?.rewards ?? []);
  const [inventory, setInventory] = useState<string[]>(data.interactiveState?.inventory ?? []);
  const [behavior, setBehavior] = useState<BehaviorStats>(data.interactiveState?.behaviorStats ?? { kindness: 50, assertiveness: 50, intimacy: 10 });
  const [wardrobe, setWardrobe] = useState<ImagePart[]>(data.interactiveState?.wardrobe ?? []);
  const [modifications, setModifications] = useState<ImagePart[]>(data.interactiveState?.modifications ?? []);

  const [currentDisplayImage, setCurrentDisplayImage] = useState<ImagePart>(data.images.main);
  const [stickyImage, setStickyImage] = useState<ImagePart | null>(null);
  const [view, setView] = useState<'chat' | 'bio' | 'customize' | 'activities' | 'shop' | 'vault' | 'save'>('chat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLiveSync, setIsLiveSync] = useState(false);
  const [openCustomizeSection, setOpenCustomizeSection] = useState<string | null>('apparel');
  const [vaultSubView, setVaultSubView] = useState<'memories' | 'wardrobe' | 'mods'>('memories');
  
  const [pendingRemoved, setPendingRemoved] = useState<string[]>(removedItems);

  const [notifications, setNotifications] = useState<{activities: boolean; vault: boolean; shop: boolean}>({
      activities: false,
      vault: false,
      shop: false
  });

  const [isRenaming, setIsRenaming] = useState(false);
  const [newNameInput, setNewNameInput] = useState(data.details.name);
  const [activeQuestTitle, setActiveQuestTitle] = useState<string | null>(null);
  const [questChoices, setQuestChoices] = useState<string[]>([]);

  const idleTimerRef = useRef<any>(null);
  const emotionResetTimer = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const relLevel = affinity > 1000 ? 'Soulmate' : affinity > 600 ? 'Intimate' : affinity > 300 ? 'Companion' : affinity > 100 ? 'Acquaintance' : 'Stranger';

  // Legacy data migration: Move legacy costumes into Wardrobe bucket
  useEffect(() => {
    if (data.images?.costumes && data.images.costumes.length > 0) {
        const legacyCostumes = data.images.costumes;
        const missingInVault = legacyCostumes.filter(lc => 
            !wardrobe.find(w => w.data === lc.data) && !modifications.find(m => m.data === lc.data)
        );
        if (missingInVault.length > 0) {
            setWardrobe(prev => [...missingInVault, ...prev]);
        }
    }
  }, [data.images?.costumes, wardrobe, modifications]);

  useEffect(() => {
    onUpdateInteractiveState({ 
        affinityScore: affinity, nexusCredits: credits, relationshipLevel: relLevel, 
        removedApparel: removedItems, currentEnvironment: environment, isTtsEnabled, 
        chatHistory: messages, hunger, energy, mood, rewards, inventory, 
        behaviorStats: behavior, wardrobe, modifications 
    });
  }, [affinity, credits, removedItems, environment, isTtsEnabled, messages, hunger, energy, mood, rewards, inventory, behavior, wardrobe, modifications, onUpdateInteractiveState, relLevel]);

  useEffect(() => {
    if (view === 'activities' || view === 'vault' || view === 'shop') {
        setNotifications(prev => ({ ...prev, [view]: false }));
    }
    // Fixed scroll behavior: Ensure the chat container stays at the bottom when switching back
    if (view === 'chat') {
        const scrollTimeout = setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
        return () => clearTimeout(scrollTimeout);
    }
  }, [view]);

  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, isTyping]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(async () => {
        if (view === 'chat' && !isTyping && !isProcessing && !isLiveSync) {
            const ping = await generateIdlePing(data.details!, relLevel, mood);
            setMessages(prev => [...prev, { role: 'model', text: ping, emotion: 'thoughtful' }]);
            if (isTtsEnabled) speakText(ping);
        }
    }, 180000); 
  }, [view, isTyping, isProcessing, isLiveSync, data.details, relLevel, mood, isTtsEnabled]);

  useEffect(() => {
    resetIdleTimer();
    return () => clearTimeout(idleTimerRef.current);
  }, [messages, resetIdleTimer]);

  const speakText = async (text: string) => {
    audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBytes = await generateCharacterSpeech(text, data.details!.voicePrompt);
    const buffer = await decodeAudioData(audioBytes, audioCtxRef.current);
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtxRef.current.destination);
    source.start();
  };

  const handleSend = async (customMsg?: string) => {
    const text = customMsg || input;
    if (!text.trim() || isTyping || isProcessing) return;
    setInput('');
    setQuestChoices([]); 
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsTyping(true);

    try {
      const response = await getCharacterChatResponse(messages, text, data.details!, relLevel, affinity, activeQuestTitle || undefined, { hunger, energy, mood }, behavior);
      setAffinity(prev => Math.max(0, prev + response.affinityGain));
      setCredits(prev => Math.max(0, prev + response.creditsGain));
      
      if (response.dispositionShift) {
          setBehavior(prev => ({
              kindness: Math.min(100, Math.max(0, prev.kindness + (response.dispositionShift?.kindness || 0))),
              assertiveness: Math.min(100, Math.max(0, prev.assertiveness + (response.dispositionShift?.assertiveness || 0))),
              intimacy: Math.min(100, Math.max(0, prev.intimacy + (response.dispositionShift?.intimacy || 0))),
          }));
      }

      setMessages(prev => [...prev, { role: 'model', text: response.text, emotion: response.emotion as any, choices: response.choices }]);
      
      if (response.choices) setQuestChoices(response.choices);
      if (response.questComplete) handleQuestCompletion();
      
      const poses = data.images!.poses;
      const poseMap: any = { happy: poses[1], angry: poses[2], thoughtful: poses[3], neutral: poses[0] };
      if (!stickyImage) {
          const emotionalPose = poseMap[response.emotion] || poses[0];
          setCurrentDisplayImage(emotionalPose);
          if (emotionResetTimer.current) clearTimeout(emotionResetTimer.current);
          emotionResetTimer.current = setTimeout(() => setCurrentDisplayImage(poses[0]), 8000);
      }

      if (isTtsEnabled) speakText(response.text);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Signal flux detected...", emotion: 'thoughtful' }]);
    } finally { setIsTyping(false); }
  };

  const startDeepSync = async () => {
    setIsLiveSync(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
    const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
            onopen: async () => {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const source = inCtx.createMediaStreamSource(stream);
                const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
                scriptProcessor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const int16 = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
                    sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inCtx.destination);
            },
            onmessage: async (m: LiveServerMessage) => {
                const b64 = m.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (b64) {
                    nextStartTime = Math.max(nextStartTime, outCtx.currentTime);
                    const buf = await decodeAudioData(decode(b64), outCtx, 24000, 1);
                    const s = outCtx.createBufferSource();
                    s.buffer = buf;
                    s.connect(outCtx.destination);
                    s.start(nextStartTime);
                    nextStartTime += buf.duration;
                    sources.add(s);
                }
                if (m.serverContent?.interrupted) {
                    sources.forEach(s => s.stop());
                    sources.clear();
                    nextStartTime = 0;
                }
            },
            onclose: () => setIsLiveSync(false),
            onerror: () => setIsLiveSync(false),
        },
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: `You are ${data.details.name}. Real-time voice interaction. Be seductive, responsive, and maintain your personality: ${data.details.personality.join(', ')}.`,
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
    });
    liveSessionRef.current = await sessionPromise;
  };

  const stopDeepSync = () => {
      if (liveSessionRef.current) liveSessionRef.current.close();
      setIsLiveSync(false);
  };

  const handleQuestCompletion = async () => {
      const completedTitle = activeQuestTitle;
      if (completedTitle === 'Formal Dinner') setHunger(prev => Math.min(100, prev + 50));
      if (completedTitle === 'Sensory Break') setEnergy(prev => Math.min(100, prev + 50));
      setActiveQuestTitle(null);
      setQuestChoices([]);
      const newReward: Reward = {
          id: Math.random().toString(36).substr(2, 9),
          title: `Memory: ${completedTitle || 'Discovery'}`,
          description: `A cinematic capture of your bond.`,
          prompt: `Character ${data.details!.name} celebrating quest completion. Seductive and high-quality.`,
          status: 'locked',
          dateEarned: new Date().toLocaleDateString()
      };
      setRewards(prev => [newReward, ...prev]);
      setNotifications(prev => ({ ...prev, vault: true }));
      setIsProcessing(true);
      try {
          const newQuest = await generateNewQuest(data.details!);
          const updatedQuests = data.details!.quests.filter(q => q.title !== completedTitle);
          updatedQuests.push(newQuest);
          onUpdateCharacterDetails({ quests: updatedQuests });
          setNotifications(prev => ({ ...prev, activities: true }));
      } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleManifestReward = async (rewardId: string) => {
    setIsProcessing(true);
    try {
        const reward = rewards.find(r => r.id === rewardId);
        if (!reward) return;
        const hqImage = await generateRewardImage(data.images!.main, reward.prompt);
        setRewards(prev => prev.map(r => r.id === rewardId ? { ...r, status: 'unlocked', image: hqImage } : r));
    } catch (e) {
        window.alert(`Manifestation suspended: Quota reached.`);
    } finally { setIsProcessing(false); }
  };

  const buyItem = (item: InventoryItem) => {
      if (credits < item.cost) return;
      setCredits(prev => prev - item.cost);
      setInventory(prev => [...prev, item.id]);
  };

  const useItem = (itemId: string) => {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return;
      if (item.statImpact) {
          if (item.statImpact.hunger) setHunger(prev => Math.min(100, prev + item.statImpact!.hunger!));
          if (item.statImpact.energy) setEnergy(prev => Math.min(100, prev + item.statImpact!.energy!));
          if (item.statImpact.mood) setMood(prev => Math.min(100, prev + item.statImpact!.mood!));
          if (item.statImpact.affinity) setAffinity(prev => prev + item.statImpact!.affinity!);
      }
      setInventory(prev => {
          const idx = prev.indexOf(itemId);
          const next = [...prev];
          next.splice(idx, 1);
          return next;
      });
      handleSend(`[Gift: ${item.name}] I thought you might like this!`);
  };

  const handleModify = async (newRemoved?: string[], newEnv?: string, costume?: string) => {
    setIsProcessing(true);
    try {
      const targetRemoved = newRemoved !== undefined ? newRemoved : removedItems;
      const newImg = await generateModifiedImage(data.images!.original || data.images!.main, targetRemoved, newEnv || environment, costume, data.details?.baseApparel);
      
      // Categorization fix: If a named 'costume' style is selected, it ALWAYS goes to Wardrobe.
      // If no costume is specified (e.g. just removing layers), it goes to Mods.
      if (costume) {
          setWardrobe(prev => [newImg, ...prev]);
      } else {
          setModifications(prev => [newImg, ...prev]);
      }

      onNewCostumeUnlocked(newImg); 
      if (newRemoved !== undefined) setRemovedItems(newRemoved);
      if (newEnv) setEnvironment(newEnv);
      setCurrentDisplayImage(newImg); 
      setNotifications(prev => ({ ...prev, vault: true }));
    } catch (e) { window.alert("Synthesis failed."); } finally { setIsProcessing(false); }
  };

  const handleRerollQuest = async (index: number) => {
      setIsProcessing(true);
      try {
          const newQuest = await generateNewQuest(data.details!);
          const updatedQuests = [...data.details!.quests];
          updatedQuests[index] = newQuest;
          onUpdateCharacterDetails({ quests: updatedQuests });
      } catch (e) {
          window.alert("Reroll failed.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleExportBundle = async () => {
    setIsProcessing(true);
    try {
        const zip = new JSZip();
        const characterName = data.details!.name || 'Nexus';
        zip.file("neural_manifest.json", JSON.stringify(data, null, 2));
        const chatLog = messages.map(m => `[${m.role.toUpperCase()}]: ${m.text}`).join('\n\n');
        zip.file("interaction_logs.txt", chatLog);
        const posesFolder = zip.folder("Neural_Assets/Poses");
        if (posesFolder) {
            posesFolder.file("origin.png", data.images!.original?.data || data.images!.main.data, {base64: true});
            data.images!.poses.forEach((p, i) => {
                const label = ['Neutral', 'Joy', 'Anger', 'Thoughtful'][i] || `pose_${i}`;
                posesFolder.file(`${label}.png`, p.data, {base64: true});
            });
        }
        if (wardrobe.length > 0) {
            const wardrobeFolder = zip.folder("Neural_Assets/Wardrobe");
            wardrobe.forEach((c, i) => wardrobeFolder?.file(`style_${i + 1}.png`, c.data, {base64: true}));
        }
        if (modifications.length > 0) {
            const modsFolder = zip.folder("Neural_Assets/Modifications");
            modifications.forEach((m, i) => modsFolder?.file(`modification_${i + 1}.png`, m.data, {base64: true}));
        }
        if (rewards.some(r => r.status === 'unlocked' && r.image)) {
            const vaultFolder = zip.folder("Neural_Assets/Vault_Memories");
            rewards.forEach(r => {
                if (r.status === 'unlocked' && r.image) {
                    const safeTitle = r.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    vaultFolder?.file(`${safeTitle}.png`, r.image.data, {base64: true});
                }
            });
        }
        const content = await zip.generateAsync({type:"blob"});
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${characterName}_Neural_Archive.zip`;
        a.click();
    } catch (e) { window.alert("Archive generation failed."); } finally { setIsProcessing(false); }
  };

  const toggleSection = (section: string) => setOpenCustomizeSection(openCustomizeSection === section ? null : section);
  const initiateDining = () => { setView('chat'); setActiveQuestTitle('Formal Dinner'); handleSend("I'd like to take you out for a formal dinner tonight. Somewhere special."); };
  const initiateCaffeine = () => { setView('chat'); setActiveQuestTitle('Sensory Break'); handleSend("Let's grab a coffee and just relax for a moment. I want to talk."); };
  const togglePendingApparel = (item: string) => setPendingRemoved(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  const confirmApparelChanges = () => handleModify(pendingRemoved);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[850px] animate-fadeIn">
      <div className="lg:w-1/2 relative bg-black rounded-2xl border border-gray-800 overflow-hidden shadow-2xl flex items-center justify-center">
        {isProcessing && <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 animate-pulse text-green-500 font-bold uppercase tracking-widest">Neural Link Syncing...</div>}
        <img src={`data:${currentDisplayImage.mimeType};base64,${currentDisplayImage.data}`} alt="Nexus" className="w-full h-full object-contain" />
      </div>

      <div className="lg:w-1/2 flex flex-col bg-gray-900/10 backdrop-blur-sm rounded-2xl border border-gray-800 p-6 overflow-hidden">
        <div className="mb-4 space-y-4">
            <div className="flex justify-between items-end">
                <div className="flex flex-col">
                    <h2 className="text-3xl font-bold text-white tracking-widest uppercase font-orbitron leading-none">{data.details.name}</h2>
                    <span className="text-[9px] text-gray-600 font-mono mt-2">Affinity: {affinity} / 1000 AP</span>
                </div>
                <div className="text-right flex flex-col items-end">
                    <span className="text-lg text-green-500 font-bold uppercase tracking-widest leading-none">{relLevel}</span>
                    <span className="text-[10px] text-green-500/50 font-mono mt-1">◎ {credits}</span>
                </div>
            </div>
            <div className="w-full h-2 bg-black/40 rounded-full border border-white/5 relative overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-1000 shadow-[0_0_10px_#22c55e]" style={{ width: `${Math.min(100, (affinity / 1000) * 100)}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3 pt-2">
                <UnifiedStatIndicator icon="◈" value={hunger} label="Hunger" />
                <UnifiedStatIndicator icon="☇" value={energy} label="Energy" />
                <UnifiedStatIndicator icon="✧" value={mood} label="Mood" />
                <UnifiedStatIndicator icon="❤" value={behavior.kindness} label="Kindness" />
                <UnifiedStatIndicator icon="⚔" value={behavior.assertiveness} label="Assertion" />
                <UnifiedStatIndicator icon="⚭" value={behavior.intimacy} label="Intimacy" />
            </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 mb-6 border-b border-gray-800/50 pb-2">
            {['chat', 'bio', 'customize', 'activities', 'shop', 'vault', 'save'].map(t => (
                <button key={t} onClick={() => setView(t as any)} className={`text-[9px] font-bold uppercase tracking-tighter py-2 transition-all text-center relative ${view === t ? 'text-green-400 border-b border-green-400' : 'text-gray-500 hover:text-gray-300'}`}>
                    {t}{notifications[t as keyof typeof notifications] && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]" />}
                </button>
            ))}
        </div>

        <div className="flex-grow overflow-hidden relative">
            {view === 'chat' && (
                <div className="flex flex-col h-full">
                    <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-hide">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${m.role === 'user' ? 'bg-green-500/10 border border-green-500/20 text-green-50' : 'bg-gray-800/90 text-gray-200 shadow-lg'}`}>{m.text}</div>
                            </div>
                        ))}
                        {isTyping && <div className="text-[10px] text-green-500 font-mono animate-pulse uppercase">Syncing Stream...</div>}
                        <div ref={chatEndRef} />
                    </div>
                    {questChoices.length > 0 && <div className="grid grid-cols-2 gap-2 mb-4">{questChoices.map((c, i) => <button key={i} onClick={() => handleSend(c)} className="p-3 text-[10px] font-bold text-gray-400 bg-gray-800/40 border border-gray-700 rounded-xl hover:border-green-500 hover:text-green-400 transition-all uppercase">{c}</button>)}</div>}
                    <div className="flex gap-2 items-center">
                        <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Transmit message..." className="flex-grow bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-green-500/40 outline-none" />
                        <button onClick={isLiveSync ? stopDeepSync : startDeepSync} className={`p-3 rounded-xl border transition-all ${isLiveSync ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/30'}`} title="Deep Sync Voice"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
                        <button onClick={() => handleSend()} className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-xl hover:bg-green-500/30"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></button>
                    </div>
                </div>
            )}

            {view === 'bio' && <CharacterDetails data={data} selectedPose={currentDisplayImage} onSelectImage={(img) => { setStickyImage(img); setCurrentDisplayImage(img); }} isRenaming={isRenaming} setIsRenaming={setIsRenaming} newNameInput={newNameInput} setNewNameInput={setNewNameInput} handleRenameSubmit={async () => { const profile = await generateRenamedProfile(data.details!, newNameInput); onUpdateCharacterDetails(profile); setIsRenaming(false); }} handleRandomRename={async () => { const name = await generateRandomName(data.details!); setNewNameInput(name); }} onUpdateCharacterDetails={onUpdateCharacterDetails} settings={{}} onReset={() => {}} />}

            {view === 'customize' && (
                <div className="h-full overflow-y-auto pr-2 py-4 space-y-4">
                    <AccordionItem title="Apparel Selection" isOpen={openCustomizeSection === 'apparel'} onToggle={() => toggleSection('apparel')}>
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">{data.details.baseApparel.map(item => <button key={item} onClick={() => togglePendingApparel(item)} className={`px-3 py-2 text-[9px] font-bold rounded-lg border uppercase transition-all flex items-center gap-2 ${pendingRemoved.includes(item) ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-green-500/5 border-green-500/20 text-green-500'}`}><div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${pendingRemoved.includes(item) ? 'border-red-500/50' : 'border-green-500/50'}`}>{!pendingRemoved.includes(item) && <div className="w-1.5 h-1.5 bg-green-500 rounded-sm" />}</div>{item}</button>)}</div>
                            <button onClick={confirmApparelChanges} disabled={isProcessing || (pendingRemoved.length === removedItems.length && pendingRemoved.every(v => removedItems.includes(v)))} className="w-full py-3 bg-green-500/20 border border-green-500/40 rounded-xl text-[10px] font-bold text-green-400 hover:bg-green-500/30 transition-all uppercase disabled:opacity-20">Confirm Apparel Changes</button>
                        </div>
                    </AccordionItem>
                    <AccordionItem title="Atmospheric Environment" isOpen={openCustomizeSection === 'env'} onToggle={() => toggleSection('env')}><select value={environment} onChange={e => handleModify(undefined, e.target.value)} className="w-full bg-black border border-gray-800 text-xs font-bold text-green-500 p-3 rounded-xl outline-none appearance-none">{ENVIRONMENTS.map(env => <option key={env} value={env}>{env}</option>)}</select></AccordionItem>
                    <AccordionItem title="Manifest Styles (50◎)" isOpen={openCustomizeSection === 'style'} onToggle={() => toggleSection('style')}><div className="grid grid-cols-2 gap-3">{COSTUMES.map(style => <button key={style} onClick={() => handleModify(undefined, undefined, style)} className="p-3 bg-gray-900/40 border border-gray-800 rounded-xl text-[9px] font-bold text-gray-400 hover:border-green-500 transition-all uppercase">{style}</button>)}</div></AccordionItem>
                </div>
            )}

            {view === 'activities' && (
                <div className="h-full overflow-y-auto pr-2 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <button onClick={initiateDining} className="p-6 border border-green-500/30 bg-green-500/5 rounded-2xl hover:bg-green-500/10 transition-all text-center flex flex-col items-center gap-2 group"><span className="text-2xl group-hover:scale-110 transition-transform">🍽</span><h3 className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Formal Dinner</h3><p className="text-[8px] text-gray-500">Restores hunger through narrative connection.</p></button>
                        <button onClick={initiateCaffeine} className="p-6 border border-cyan-500/30 bg-cyan-500/5 rounded-2xl hover:bg-cyan-500/10 transition-all text-center flex flex-col items-center gap-2 group"><span className="text-2xl group-hover:scale-110 transition-transform">☕</span><h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Sensory Break</h3><p className="text-[8px] text-gray-500">Restores energy via deep interaction.</p></button>
                    </div>
                    <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl mb-4"><h3 className="text-green-400 font-bold uppercase text-[10px] tracking-widest">Available Quests</h3><p className="text-gray-500 text-[9px]">Shared narrative nodes to deepen your bond.</p></div>
                    {data.details.quests.map((q, i) => (
                        <div key={i} className="relative group mb-4">
                            <button onClick={() => { setActiveQuestTitle(q.title); setView('chat'); handleSend(`Let's explore: ${q.title}`); }} className="w-full text-left p-4 border border-gray-800 rounded-2xl bg-black/30 hover:border-green-500/50 transition-all group/btn">
                                <h4 className="text-sm font-bold text-white group-hover/btn:text-green-400 uppercase tracking-widest pr-8">{q.title}</h4>
                                <p className="text-[10px] text-gray-500 mt-1">{q.description}</p>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleRerollQuest(i); }} className="absolute top-4 right-4 text-gray-600 hover:text-green-500 transition-colors p-1" title="Reroll Quest">
                                <DiceIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {view === 'shop' && (
                <div className="h-full overflow-y-auto pr-2 py-4 space-y-8">
                    <div><h3 className="text-green-400 font-bold uppercase text-xs mb-3">Nexus Shop</h3><div className="grid grid-cols-2 gap-4">{SHOP_ITEMS.map(item => <button key={item.id} onClick={() => buyItem(item)} disabled={credits < item.cost} className="p-4 border border-gray-800 rounded-2xl bg-black/20 hover:border-green-500/50 transition-all text-left disabled:opacity-30"><div className="flex justify-between items-start mb-1"><span className="text-xl text-green-500">{item.icon}</span><span className="text-[9px] font-bold text-green-500">◎ {item.cost}</span></div><h4 className="text-[10px] font-bold text-white uppercase">{item.name}</h4><p className="text-[8px] text-gray-500">{item.description}</p></button>)}</div></div>
                    <div><h3 className="text-purple-400 font-bold uppercase text-xs mb-3">Inventory</h3><div className="grid grid-cols-3 gap-2">{inventory.map((id, idx) => { const item = SHOP_ITEMS.find(i => i.id === id); if (!item) return null; return <button key={idx} onClick={() => useItem(id)} className="p-3 border border-gray-800 rounded-xl bg-gray-900/40 hover:border-purple-500 flex flex-col items-center"><span className="text-xl mb-1 text-green-500">{item.icon}</span><span className="text-[8px] font-bold text-gray-400 uppercase">{item.name}</span></button>; })}</div></div>
                </div>
            )}

            {view === 'vault' && (
                <div className="h-full flex flex-col">
                    <div className="flex gap-4 mb-4 border-b border-gray-800/50 pb-2 overflow-x-auto scrollbar-hide">{['memories', 'wardrobe', 'mods'].map(tab => <button key={tab} onClick={() => setVaultSubView(tab as any)} className={`text-[10px] font-bold uppercase tracking-widest transition-all ${vaultSubView === tab ? 'text-green-400' : 'text-gray-600 hover:text-gray-300'}`}>{tab}</button>)}</div>
                    <div className="flex-grow overflow-y-auto pr-2 py-2 space-y-4 scrollbar-hide">
                        {vaultSubView === 'memories' && (rewards.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 opacity-50"><span className="text-2xl">🖼</span><p className="text-[10px] text-gray-500 uppercase font-mono tracking-widest leading-relaxed">No CG Memories Manifested.</p></div> : rewards.map(reward => <div key={reward.id} className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">{reward.status === 'unlocked' && reward.image ? <div className="aspect-video w-full bg-black relative"><img src={`data:${reward.image.mimeType};base64,${reward.image.data}`} alt={reward.title} className="w-full h-full object-cover" /><div className="absolute bottom-0 p-3 bg-gradient-to-t from-black to-transparent w-full"><h4 className="text-xs font-bold text-white uppercase">{reward.title}</h4></div></div> : <div className="p-6 flex flex-col items-center text-center gap-3"><span className="text-2xl opacity-40">🔒</span><h4 className="text-xs font-bold text-gray-300 uppercase">{reward.title}</h4><button onClick={() => handleManifestReward(reward.id)} className="px-6 py-2 bg-purple-500/10 border border-purple-500/40 rounded-xl text-[10px] font-bold text-purple-400 hover:bg-purple-500/30 transition-all uppercase">Manifest Memory</button></div>}</div>))}
                        {vaultSubView === 'wardrobe' && (wardrobe.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 opacity-50"><span className="text-2xl">👗</span><p className="text-[10px] text-gray-500 uppercase font-mono tracking-widest leading-relaxed">No Style Modules Manifested.</p></div> : <div className="grid grid-cols-2 gap-3">{wardrobe.map((img, idx) => <div key={idx} onClick={() => { setCurrentDisplayImage(img); setStickyImage(img); }} className="aspect-[9/16] bg-black border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-green-500 transition-all group relative"><img src={`data:${img.mimeType};base64,${img.data}`} alt={`wardrobe_${idx}`} className="w-full h-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-[8px] text-gray-400 opacity-0 group-hover:opacity-100 uppercase tracking-widest text-center">Neural Style {idx+1}</div></div>)}</div>)}
                        {vaultSubView === 'mods' && (modifications.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 opacity-50"><span className="text-2xl">✂️</span><p className="text-[10px] text-gray-500 uppercase font-mono tracking-widest leading-relaxed">No Neural Modifications Logged.</p></div> : <div className="grid grid-cols-2 gap-3">{modifications.map((img, idx) => <div key={idx} onClick={() => { setCurrentDisplayImage(img); setStickyImage(img); }} className="aspect-[9/16] bg-black border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-red-500/50 transition-all group relative"><img src={`data:${img.mimeType};base64,${img.data}`} alt={`mod_${idx}`} className="w-full h-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-[8px] text-gray-400 opacity-0 group-hover:opacity-100 uppercase tracking-widest text-center">Neural Mod {idx+1}</div></div>)}</div>)}
                    </div>
                </div>
            )}
            {view === 'save' && <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-6"><div className="p-8 bg-black/40 border border-gray-800 rounded-3xl w-full"><div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">💾</div><h3 className="text-lg font-bold text-white uppercase tracking-widest mb-2">Omni-Archive Export</h3><p className="text-[10px] text-gray-500 leading-relaxed mb-8">Generates a complete Neural Bundle including manifest data, full pose gallery, categorized wardrobe, unlocked vault memories, and chat logs. Perfect for external viewing.</p><button onClick={handleExportBundle} className="w-full py-4 bg-green-500/10 border border-green-500/40 rounded-2xl text-[10px] font-bold text-green-400 hover:bg-green-500/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download Full Neural Archive</button></div></div>}
        </div>
      </div>
    </div>
  );
};
