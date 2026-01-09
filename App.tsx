
import React, { useState, useCallback, useEffect } from 'react';
import type { AppState, CharacterData, CharacterMode, Settings } from './types';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { GeneratorForm } from './components/GeneratorForm';
import { ImageUploader } from './components/ImageUploader';
import { Loader } from './components/Loader';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ImageGrid } from './components/ImageGrid';
import { CharacterSheet } from './components/CharacterSheet';
import { CharacterNexus } from './components/CharacterNexus';
import { SettingsPage } from './components/Settings';
import JSZip from 'jszip';
import {
  generateConceptImages,
  generateCharacterDetailsFromPrompt,
  generateOrthosAndPoses,
  generateCharacterDetailsFromImage,
  fileToBase64,
  editImageWithInstructions,
  rerollCharacterName,
} from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<CharacterMode>('generator');
  const [appState, setAppState] = useState<AppState>('idle');
  const [characterData, setCharacterData] = useState<CharacterData>({
    details: null,
    images: null,
    prompt: '',
    dimension: null,
  });
  const [conceptImages, setConceptImages] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showApp, setShowApp] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings>({
    imageEndpoint: 'http://127.0.0.1:7860',
    llmEndpoint: 'http://127.0.0.1:1234',
    useLocalImage: false,
    useLocalLlm: false,
  });

  useEffect(() => {
    try {
        const savedSettings = localStorage.getItem('ghotetForgeSettings');
        if (savedSettings) setSettings(JSON.parse(savedSettings));
    } catch (e) {}
    setShowApp(true);
  }, []);

  const handleGenerateConcepts = useCallback(async (prompt: string, dimension: any) => {
    setAppState('generatingConcepts');
    setCharacterData({ details: null, images: null, prompt, dimension });
    try {
      const images = await generateConceptImages(prompt, dimension, settings);
      setConceptImages(images);
      setAppState('selectingConcept');
    } catch (error) {
      setErrorMessage('The forge is cold. Try again.');
      setAppState('error');
    }
  }, [settings]);

  const generateFullCharacter = useCallback(async (prompt: string, image: string) => {
    setAppState('generatingDetails');
    try {
      const [details, visuals] = await Promise.all([
        generateCharacterDetailsFromPrompt(prompt, image, settings),
        generateOrthosAndPoses(image, prompt, settings),
      ]);
      setCharacterData(prev => ({ ...prev, details, images: { main: image, ...visuals } }));
      setAppState('displayingCharacter');
      setMode('generator');
    } catch (error) {
      setErrorMessage('Failed to forge soul.');
      setAppState('error');
    }
  }, [settings]);

  const handleSelectConcept = (img: string) => generateFullCharacter(characterData.prompt, img);

  const performGlobalNameSync = useCallback((oldName: string, newName: string) => {
    const nameRegex = new RegExp(oldName, 'gi');
    setCharacterData(prev => {
        if (!prev.details) return prev;
        
        // Deep copy and replace occurrences in text fields
        const updatedDetails = {
            ...prev.details,
            name: newName,
            backstory: prev.details.backstory.replace(nameRegex, newName),
            quests: prev.details.quests.map(q => ({
                title: q.title.replace(nameRegex, newName),
                description: q.description.replace(nameRegex, newName)
            }))
        };
        
        return {
            ...prev,
            details: updatedDetails
        };
    });
  }, []);

  const handleUpdateName = useCallback(async () => {
    if (!characterData.details) return;
    try {
        const oldName = characterData.details.name;
        const newName = await rerollCharacterName(characterData.details);
        performGlobalNameSync(oldName, newName);
    } catch (e) {
        console.error("Reroll failed", e);
    }
  }, [characterData.details, performGlobalNameSync]);

  const handleManualEditName = useCallback((newName: string) => {
    if (!characterData.details) return;
    const oldName = characterData.details.name;
    performGlobalNameSync(oldName, newName);
  }, [characterData.details, performGlobalNameSync]);

  const handleUploadImage = async (file: File, inst?: string) => {
    const isJson = file.type === 'application/json' || file.name.endsWith('.json');
    const isZip = file.type === 'application/zip' || file.name.endsWith('.zip');
    
    if (isZip) {
      setAppState('generatingDetails');
      try {
        const zip = new JSZip();
        const content = await zip.loadAsync(file);
        const jsonFile = Object.keys(content.files).find(name => name.endsWith('.json'));
        if (!jsonFile) throw new Error("No neural package found in zip");
        
        const jsonData = await content.files[jsonFile].async("string");
        const data = JSON.parse(jsonData);
        
        if (!data.character || !data.character.details) throw new Error("Invalid neural package structure");

        setCharacterData({
            prompt: 'Imported Bundle',
            details: data.character.details,
            dimension: null,
            images: data.character.images
        });
        setAppState('displayingCharacter');
        setMode('nexus' as any);
        return;
      } catch (e) {
        setErrorMessage('Neural bundle corruption detected.');
        setAppState('error');
        return;
      }
    }

    if (isJson) {
        setAppState('generatingDetails');
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!data.character || !data.character.details) throw new Error("Invalid neural package");
            
            setCharacterData({
                prompt: 'Imported',
                details: data.character.details,
                dimension: null,
                images: data.character.images
            });
            setAppState('displayingCharacter');
            setMode('nexus' as any);
            return;
        } catch (e) {
            setErrorMessage('Neural package corruption detected.');
            setAppState('error');
            return;
        }
    }

    setAppState('generatingDetails');
    const targetMode = mode;
    try {
      let img = await fileToBase64(file);
      if (inst && targetMode === 'uploader') img = await editImageWithInstructions(img, inst, settings);
      
      const [details, visuals] = await Promise.all([
          generateCharacterDetailsFromImage(img, settings),
          generateOrthosAndPoses(img, inst || 'character', settings),
      ]);
      
      setCharacterData({ prompt: inst || 'Reforged', details, dimension: null, images: { main: img, ...visuals } });
      setAppState('displayingCharacter');
      
      if (targetMode === 'interactive') {
        setMode('nexus' as any);
      } else {
        setMode('generator');
      }
    } catch (e) {
      setErrorMessage('Analysis failed. The subject is unstable.');
      setAppState('error');
    }
  };

  const handleReset = () => {
    setAppState('idle');
    setCharacterData({ details: null, images: null, prompt: '', dimension: null });
    setConceptImages([]);
    setMode('generator');
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
              {appState === 'selectingConcept' && <ImageGrid images={conceptImages} onSelect={handleSelectConcept} />}
              
              {appState === 'displayingCharacter' && (
                <div className="w-full max-w-6xl mx-auto animate-fadeIn">
                    <div className="flex w-full bg-black/30 rounded-t-lg overflow-hidden border-x border-t border-gray-800">
                        <button className={`w-1/2 py-3 text-center font-semibold uppercase tracking-widest text-sm transition-all border-b-2 ${mode === 'generator' ? 'border-green-500 text-green-400' : 'border-gray-800 text-gray-500'}`} onClick={() => setMode('generator')}>Character Sheet</button>
                        <button className={`w-1/2 py-3 text-center font-semibold uppercase tracking-widest text-sm transition-all border-b-2 ${mode === 'nexus' as any ? 'border-green-500 text-green-400' : 'border-gray-800 text-gray-500'}`} onClick={() => setMode('nexus' as any)}>Nexus Link</button>
                    </div>
                    <div className="bg-black/20 p-6 border-x border-b border-gray-800 rounded-b-lg">
                        {(mode as any) === 'nexus' ? <CharacterNexus data={characterData} /> : <CharacterSheet data={characterData} onRedo={() => handleGenerateConcepts(characterData.prompt, characterData.dimension)} onTweak={handleGenerateConcepts} onReset={handleReset} onEditName={handleManualEditName} onUpdateName={handleUpdateName} />}
                    </div>
                </div>
              )}

              {appState === 'error' && <ErrorDisplay message={errorMessage} onReset={handleReset} />}
              
              {appState === 'idle' && (
                <div className="w-full max-w-2xl mx-auto">
                  <ModeSelector currentMode={mode} onSetMode={setMode} />
                  {mode === 'generator' ? (
                    <GeneratorForm onSubmit={handleGenerateConcepts} settings={settings} />
                  ) : (
                    <ImageUploader 
                      onUpload={handleUploadImage} 
                      title={mode === 'interactive' ? "Neural Synchronizer" : "Reforge Sequence"}
                      description={mode === 'interactive' ? "Upload an image, JSON package, or ZIP bundle to resume a character link." : "Upload a sketch to refine it into high-fidelity concept art."}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
