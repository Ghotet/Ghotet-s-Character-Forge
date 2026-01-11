import React from 'react';
import type { Settings } from '../types';
import { Button } from './Button';

interface SettingsPageProps {
  settings: Settings;
  onSettingsChange: (newSettings: Settings) => void;
  onClose: () => void;
}

interface ToggleSwitchProps {
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, enabled, onChange }) => {
    return (
        <label className="flex items-center cursor-pointer">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
                <div className={`block w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-green-800/50' : 'bg-gray-800'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-gray-400 w-6 h-6 rounded-full transition-transform ${enabled ? 'translate-x-full bg-green-400' : ''}`}></div>
            </div>
            <div className="ml-3 text-gray-300 font-medium">
                {label} ({enabled ? 'Local' : 'Cloud'})
            </div>
        </label>
    );
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSettingsChange, onClose }) => {

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };
  
  const handleToggleChange = (key: keyof Settings, value: boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-900/50 p-6 rounded-lg border border-gray-800">
        <h2 
            className="text-2xl font-bold text-green-400 mb-6 border-b-2 border-green-500/30 pb-3"
            style={{ textShadow: '0 0 5px rgba(50,255,20,0.5)' }}
        >
            Settings
        </h2>

        <div className="space-y-6">
            {/* Image Generation Settings */}
            <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Image Generation</h3>
                <div className="flex items-center gap-4 p-4 bg-black/30 rounded-md border border-gray-700">
                    <ToggleSwitch 
                        label="Image Source" 
                        enabled={settings.useLocalImage} 
                        onChange={(val) => handleToggleChange('useLocalImage', val)} 
                    />
                    <div className="flex-grow">
                        <label htmlFor="imageEndpoint" className="sr-only">Image Endpoint</label>
                        <input
                        type="text"
                        id="imageEndpoint"
                        name="imageEndpoint"
                        value={settings.imageEndpoint}
                        onChange={handleInputChange}
                        disabled={!settings.useLocalImage}
                        className="w-full bg-black border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300 placeholder:text-gray-600 disabled:opacity-50"
                        placeholder="http://127.0.0.1:7860"
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 px-1">Toggle to use a local, A1111-compatible API endpoint for image generation.</p>
            </div>
            
            {/* LLM Settings */}
            <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-3">AI Processing / LLM</h3>
                 <div className="flex items-center gap-4 p-4 bg-black/30 rounded-md border border-gray-700">
                    <ToggleSwitch 
                        label="LLM Source" 
                        enabled={settings.useLocalLlm} 
                        onChange={(val) => handleToggleChange('useLocalLlm', val)} 
                    />
                    <div className="flex-grow">
                        <label htmlFor="llmEndpoint" className="sr-only">LLM Endpoint</label>
                        <input
                        type="text"
                        id="llmEndpoint"
                        name="llmEndpoint"
                        value={settings.llmEndpoint}
                        onChange={handleInputChange}
                        disabled={!settings.useLocalLlm}
                        className="w-full bg-black border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-300 placeholder:text-gray-600 disabled:opacity-50"
                        placeholder="http://127.0.0.1:1234"
                        />
                    </div>
                </div>
                 <p className="text-xs text-gray-500 mt-2 px-1">Toggle to use a local, LM Studio-compatible (OpenAI API) endpoint for text generation.</p>
            </div>
        </div>

        <div className="mt-8 text-center">
            <Button onClick={onClose}>Done</Button>
        </div>
    </div>
  );
};