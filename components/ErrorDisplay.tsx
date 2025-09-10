
import React from 'react';
import { Button } from './Button';

interface ErrorDisplayProps {
  message: string;
  onReset: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onReset }) => {
  return (
    <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg relative text-center max-w-2xl mx-auto" role="alert">
      <strong className="font-bold block mb-2">An Error Occurred!</strong>
      <span className="block sm:inline">{message}</span>
      <div className="mt-4">
        <Button onClick={onReset} variant="secondary">Try Again</Button>
      </div>
    </div>
  );
};
