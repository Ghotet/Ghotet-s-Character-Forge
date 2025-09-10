import React, { useState, useCallback, useEffect } from 'react';
import type { AppState, CharacterData, CharacterMode } from './types';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { GeneratorForm } from './components/GeneratorForm';
import { ImageUploader } from './components/ImageUploader';
import { Loader } from './components/Loader';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ImageGrid } from './components/ImageGrid';
import { CharacterSheet } from './components/CharacterSheet';
import {
  generateConceptImages,
  generateCharacterDetailsFromPrompt,
  generateOrthosAndPoses,
  generateCharacterDetailsFromImage,
  fileToBase64,
  generateCharacterName,
} from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<CharacterMode>('generator');
  const [appState, setAppState] = useState<AppState>('idle');
  const [characterData, setCharacterData] = useState<CharacterData>({
    details: null,
    images: null,
    prompt: '',
  });
  const [conceptImages, setConceptImages] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showApp, setShowApp] = useState<boolean>(false);

  useEffect(() => {
    setShowApp(true);
  }, []);

  const handleError = (message: string) => {
    setErrorMessage(message);
    setAppState('error');
  };

  const handleGenerateConcepts = useCallback(async (prompt: string) => {
    setAppState('generatingConcepts');
    setCharacterData({ details: null, images: null, prompt });
    try {
      const images = await generateConceptImages(prompt);
      setConceptImages(images);
      setAppState('selectingConcept');
    } catch (error) {
      console.error(error);
      handleError('Failed to generate concept images. The forge is cold.');
    }
  }, []);

  const generateFullCharacter = useCallback(async (prompt: string, image: string) => {
    setAppState('generatingDetails');
    try {
      const [details, visuals] = await Promise.all([
        generateCharacterDetailsFromPrompt(prompt, image),
        generateOrthosAndPoses(image, prompt),
      ]);
      setCharacterData({
        prompt,
        details,
        images: {
          main: image,
          ...visuals,
        },
      });
      setAppState('displayingCharacter');
    } catch (error) {
      console.error(error);
      handleError('Failed to forge character details. The spirits are unwilling.');
    }
  }, []);

  const handleSelectConcept = useCallback(
    async (image: string) => {
      await generateFullCharacter(characterData.prompt, image);
    },
    [characterData.prompt, generateFullCharacter]
  );

  const handleUploadImage = useCallback(
    async (file: File) => {
      setAppState('generatingDetails');
      try {
        const base64Image = await fileToBase64(file);
        const [details, visuals] = await Promise.all([
            generateCharacterDetailsFromImage(base64Image),
            generateOrthosAndPoses(base64Image, 'the character in the image'),
        ]);

        setCharacterData({
          prompt: 'Image Upload',
          details,
          images: {
            main: base64Image,
            ...visuals,
          },
        });
        setAppState('displayingCharacter');
      } catch (error) {
        console.error(error);
        handleError('Failed to analyze the uploaded image. Is it cursed?');
      }
    },
    []
  );
  
  const handleEditName = (name: string) => {
    if (!characterData.details) return;
    setCharacterData(prev => ({
      ...prev,
      details: { ...prev.details!, name },
    }));
  };

  const handleUpdateName = useCallback(async () => {
    if (!characterData.details) return;
    const description = characterData.prompt || 'this character'; 
    try {
      const newName = await generateCharacterName(description);
      handleEditName(newName);
    } catch (error) {
        console.error("Failed to generate a new name:", error);
        // Silently fail, do not trigger full screen error for this non-critical action
    }
  }, [characterData.prompt, characterData.details]);

  const handleReset = () => {
    setAppState('idle');
    setCharacterData({ details: null, images: null, prompt: '' });
    setConceptImages([]);
    setErrorMessage('');
  };

  const renderContent = () => {
    switch (appState) {
      case 'generatingConcepts':
      case 'generatingDetails':
        return <Loader state={appState} />;
      case 'selectingConcept':
        return <ImageGrid images={conceptImages} onSelect={handleSelectConcept} />;
      case 'displayingCharacter':
        return (
          <CharacterSheet
            data={characterData}
            onRedo={() => handleGenerateConcepts(characterData.prompt)}
            onTweak={handleGenerateConcepts}
            onReset={handleReset}
            onEditName={handleEditName}
            onUpdateName={handleUpdateName}
          />
        );
      case 'error':
        return <ErrorDisplay message={errorMessage} onReset={handleReset} />;
      case 'idle':
      default:
        return (
          <div className="w-full max-w-2xl mx-auto">
            <ModeSelector currentMode={mode} onSetMode={setMode} />
            {mode === 'generator' ? (
              <GeneratorForm onSubmit={handleGenerateConcepts} />
            ) : (
              <ImageUploader onUpload={handleUploadImage} />
            )}
          </div>
        );
    }
  };

  return (
    <div className={`bg-black min-h-screen font-sans text-gray-300 transition-opacity duration-1000 ${showApp ? 'opacity-100' : 'opacity-0'}`}>
      <div className="container mx-auto px-4 py-8">
        <Header onReset={handleReset} showReset={appState !== 'idle'}/>
        <main className="mt-8">{renderContent()}</main>
      </div>
    </div>
  );
};

export default App;