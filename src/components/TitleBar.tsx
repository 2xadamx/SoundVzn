import React from 'react';
import { motion } from 'framer-motion';

interface TitleBarProps {
  title?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title = 'SoundVzn' }) => {
  const handleMinimize = () => {
    window.electron.minimize();
  };

  const handleMaximize = () => {
    window.electron.maximize();
  };

  const handleClose = () => {
    window.electron.close();
  };

  return (
    <div className="h-8 bg-dark-900 border-b border-dark-600 flex items-center justify-between px-4 select-none drag-region">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary-500 to-primary-700" />
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>

      <div className="flex items-center space-x-2 no-drag">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMinimize}
          className="w-8 h-8 rounded-md hover:bg-dark-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor">
            <rect width="12" height="2" />
          </svg>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMaximize}
          className="w-8 h-8 rounded-md hover:bg-dark-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="10" height="10" />
          </svg>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: '#ef4444' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClose}
          className="w-8 h-8 rounded-md hover:bg-red-500 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1L11 11M11 1L1 11" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
};
