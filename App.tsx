
import React, { useState, useCallback, useEffect } from 'react';
import type { AppState, CharacterData, Settings, InteractiveState, ImagePart, CharacterDetails } from './types';
import { Header } from './components/Header';
import { Loader } from './components/Loader';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ImageGrid } from './components/ImageGrid';
import { CharacterNexus } from './components/CharacterNexus';
import { SettingsPage } from './components/Settings';
import JSZip from 'jszip';
import { InteractiveIntro } from './components/InteractiveIntro';
import {
  generateConceptImages,
  generateCharacterDetailsFromPrompt,
  generateEmotionalPoses,
  generateCharacterDetailsFromImage,
  fileToBase64,
  generateFullBodyImage,
} from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('idle');
  const [characterData, setCharacterData] = useState<CharacterData>({
    details: null,
    images: null,
    prompt: '',
    isNeuralLinked: true,
    interactiveState: {
      resonance: 0,
      nexusCredits: 100,
      affinityScore: 0,
      relationshipLevel: 'Stranger',
      removedApparel: [],
      currentEnvironment: 'Original',
      memoryBank: [],
      chatHistory: [],
      armorLevel: 0,
      hunger: 50,
      energy: 50,
      mood: 50,
      // Added missing rewards field
      rewards: [],
      // Fix: Add missing required properties 'inventory' and 'behaviorStats'
      inventory: [],
      behaviorStats: { kindness: 50, assertiveness: 50, intimacy: 10 },
      // Fix: Add missing properties 'wardrobe' and 'modifications'
      wardrobe: [],
      modifications: [],
    },
  });
  const [conceptImages, setConceptImages] = useState<ImagePart[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showApp, setShowApp] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings>({
    imageEndpoint: 'http://127.0.0.1:7860',
    llmEndpoint: 'http://127.0.0.1:1234',
    useLocalImage: false,
    useLocalLlm: false
  });

  useEffect(() => {
    try {
        const savedSettings = localStorage.getItem('ghotetForgeSettings');
        if (savedSettings) setSettings(JSON.parse(savedSettings));
    } catch (e) {
        console.error("Failed to load settings from local storage:", e);
    }
    setShowApp(true);
  }, []);

  const handleGenerateConcepts = useCallback(async (prompt: string) => {
    setAppState('generatingConcepts');
    setCharacterData(prev => ({ ...prev, prompt }));
    try {
      const images = await generateConceptImages(prompt, settings);
      setConceptImages(images);
      setAppState('selectingConcept');
    } catch (error: any) {
      setErrorMessage(error.message || 'The neural network is unresponsive. Try again.');
      setAppState('error');
    }
  }, [settings]);

  const generateFullCharacter = useCallback(async (selectedImage: ImagePart) => {
    setAppState('generatingDetails');
    try {
      const fullBodyImage = await generateFullBodyImage(selectedImage, settings);
      const [details, poses] = await Promise.all([
        generateCharacterDetailsFromPrompt(fullBodyImage, characterData.prompt, settings),
        generateEmotionalPoses(fullBodyImage, settings),
      ]);

      setCharacterData(prev => ({ 
        ...prev, 
        details, 
        images: { main: poses[0], original: selectedImage, poses, costumes: [] },
        interactiveState: {
          resonance: 0,
          nexusCredits: 100,
          affinityScore: 0,
          relationshipLevel: 'Stranger',
          removedApparel: [],
          currentEnvironment: 'Original',
          memoryBank: [],
          chatHistory: [],
          armorLevel: 0,
          hunger: 50,
          energy: 50,
          mood: 50,
          // Added missing rewards field
          rewards: [],
          // Fix: Add missing required properties 'inventory' and 'behaviorStats'
          inventory: [],
          behaviorStats: { kindness: 50, assertiveness: 50, intimacy: 10 },
          // Fix: Add missing properties 'wardrobe' and 'modifications'
          wardrobe: [],
          modifications: [],
        },
      }));
      setAppState('displayingCharacter');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to forge neural companion.');
      setAppState('error');
    }
  }, [characterData.prompt, settings]);

  const handleImportCharacter = useCallback(async (file: File, style?: 'realistic' | 'anime') => {
    setAppState('generatingDetails');
    try {
      const isJson = file.type === 'application/json' || file.name.endsWith('.json');
      const isZip = file.type === 'application/zip' || file.name.endsWith('.zip');
      
      let importedData: CharacterData;

      if (isZip || isJson) {
        let data: any;
        if (isZip) {
          const zip = new JSZip();
          const content = await zip.loadAsync(file);
          const jsonFile = Object.keys(content.files).find(name => name.endsWith('.json'));
          if (!jsonFile) throw new Error("No neural package found in zip.");
          data = JSON.parse(await content.files[jsonFile].async("string"));
        } else {
          data = JSON.parse(await file.text());
        }
        
        importedData = data.character || data;
        
        if (!importedData.interactiveState) {
          importedData.interactiveState = {
            resonance: 0,
            nexusCredits: 100,
            affinityScore: 0,
            relationshipLevel: 'Stranger',
            removedApparel: [],
            currentEnvironment: 'Original',
            memoryBank: [],
            chatHistory: [],
            armorLevel: 0,
            hunger: 50,
            energy: 50,
            mood: 50,
            // Added missing rewards field
            rewards: [],
            // Fix: Add missing required properties 'inventory' and 'behaviorStats'
            inventory: [],
            behaviorStats: { kindness: 50, assertiveness: 50, intimacy: 10 },
            // Fix: Add missing properties 'wardrobe' and 'modifications'
            wardrobe: [],
            modifications: [],
          };
        }
      } else {
        const uploadedImagePart = await fileToBase64(file);
        const fullBodyImage = await generateFullBodyImage(uploadedImagePart, settings, style);
        const details = await generateCharacterDetailsFromImage(fullBodyImage, settings);
        const poses = await generateEmotionalPoses(fullBodyImage, settings);
        
        importedData = {
          prompt: 'Nexus Import',
          details,
          images: { main: poses[0], original: uploadedImagePart, poses, costumes: [] },
          isNeuralLinked: true,
          interactiveState: {
            resonance: 0,
            nexusCredits: 100,
            affinityScore: 0,
            relationshipLevel: 'Stranger',
            removedApparel: [],
            currentEnvironment: 'Original',
            memoryBank: [],
            chatHistory: [],
            armorLevel: 0,
            hunger: 50,
            energy: 50,
            mood: 50,
            // Added missing rewards field
            rewards: [],
            // Fix: Add missing required properties 'inventory' and 'behaviorStats'
            inventory: [],
            behaviorStats: { kindness: 50, assertiveness: 50, intimacy: 10 },
            // Fix: Add missing properties 'wardrobe' and 'modifications'
            wardrobe: [],
            modifications: [],
          },
        };
      }

      setCharacterData(importedData);
      setAppState('displayingCharacter');
    } catch (e: any) {
      setErrorMessage(e.message || 'Neural bundle corruption detected.');
      setAppState('error');
    }
  }, [settings]);

  const handleUpdateInteractiveState = useCallback((newState: Partial<InteractiveState>) => {
    setCharacterData(prev => ({
        ...prev,
        interactiveState: {
            ...prev.interactiveState!,
            ...newState,
        },
    }));
  }, []);

  const handleNewCostumeUnlocked = useCallback((costumeImagePart: ImagePart) => {
    setCharacterData(prev => ({
      ...prev,
      images: {
        ...prev.images!,
        costumes: [...(prev.images?.costumes || []), costumeImagePart],
      },
    }));
  }, []);

  const handleUpdateCharacterDetails = useCallback((newDetails: Partial<CharacterDetails>) => {
    setCharacterData(prev => ({
      ...prev,
      details: {
        ...prev.details!,
        ...newDetails,
      },
    }));
  }, []);

  const handleReset = () => {
    setAppState('idle');
    setConceptImages([]);
  };

  return (
    <div className={`bg-black min-h-screen font-sans text-gray-300 transition-opacity duration-1000 ${showApp ? 'opacity-100' : 'opacity-0'}`}>
      <div className="container mx-auto px-4 py-8">
        <Header onReset={handleReset} showReset={appState !== 'idle'} onToggleSettings={() => setShowSettings(s => !s)} />
        <main className="mt-8">
          {showSettings ? (
            <SettingsPage settings={settings} onSettingsChange={setSettings} onClose={() => setShowSettings(false)} />
          ) : (
            <>
              {(appState === 'generatingConcepts' || appState === 'generatingDetails') && <Loader state={appState} />}
              {appState === 'selectingConcept' && <ImageGrid images={conceptImages} onSelect={generateFullCharacter} />}
              
              {appState === 'displayingCharacter' && (
                <div className="w-full max-w-6xl mx-auto animate-fadeIn">
                    <CharacterNexus
                        data={characterData}
                        onUpdateInteractiveState={handleUpdateInteractiveState}
                        onNewCostumeUnlocked={handleNewCostumeUnlocked}
                        onImportCharacter={handleImportCharacter}
                        onGenerateConcepts={handleGenerateConcepts}
                        onUpdateCharacterDetails={handleUpdateCharacterDetails}
                    />
                </div>
              )}

              {appState === 'idle' && (
                <div className="w-full max-w-2xl mx-auto">
                    <InteractiveIntro 
                        onImport={handleImportCharacter} 
                        onGenerateConcepts={handleGenerateConcepts} 
                        settings={settings}
                    />
                </div>
              )}

              {appState === 'error' && <ErrorDisplay message={errorMessage} onReset={handleReset} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
