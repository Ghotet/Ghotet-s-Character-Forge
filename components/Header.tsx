import React from 'react';
import { APP_TITLE } from '../constants';
import { Button } from './Button';

interface HeaderProps {
    onReset: () => void;
    showReset: boolean;
    onToggleSettings: () => void;
}

const SettingsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export const Header: React.FC<HeaderProps> = ({ onReset, showReset, onToggleSettings }) => {
  return (
    <header className="relative text-center">
      <h1 
        className="text-4xl md:text-5xl text-green-400"
        style={{ 
          fontFamily: "'Orbitron', sans-serif"
        }}
      >
        {APP_TITLE}
      </h1>
      <div className="absolute top-1/2 right-0 -translate-y-1/2 flex items-center gap-4">
        {showReset && <Button onClick={onReset} variant="secondary">Start Over</Button>}
        <button 
            onClick={onToggleSettings} 
            className="text-gray-500 hover:text-green-400 transition-colors duration-300"
            aria-label="Open Settings"
        >
            <SettingsIcon />
        </button>
      </div>
    </header>
  );
};