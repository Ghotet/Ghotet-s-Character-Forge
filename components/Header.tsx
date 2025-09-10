
import React from 'react';
import { APP_TITLE } from '../constants';
import { Button } from './Button';

interface HeaderProps {
    onReset: () => void;
    showReset: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, showReset }) => {
  return (
    <header className="flex justify-between items-center">
      <h1 
        className="text-3xl md:text-4xl font-bold text-green-400"
        style={{ textShadow: '0 0 5px #39FF14, 0 0 10px #39FF14' }}
      >
        {APP_TITLE}
      </h1>
      {showReset && <Button onClick={onReset} variant="secondary">Start Over</Button>}
    </header>
  );
};
