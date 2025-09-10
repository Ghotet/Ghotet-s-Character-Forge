
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', ...props }) => {
  const baseClasses = 'px-6 py-2 font-bold rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black';
  
  const styles = {
    primary: 'bg-green-500/10 border border-green-500 text-green-400 hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(50,255,50,0.5)] disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600 disabled:hover:shadow-none',
    secondary: 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-600/50 hover:border-green-500 hover:text-green-400 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700',
  };

  return (
    <button className={`${baseClasses} ${styles[variant]}`} {...props}>
      {children}
    </button>
  );
};
