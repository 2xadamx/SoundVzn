import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@store/player';
import { shallow } from 'zustand/shallow';

interface MiniPlayerProps {
  onClose: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onClose }) => {
  const { currentTrack, isPlaying, setIsPlaying, playNext, playPrevious } = usePlayerStore(
    (state) => ({
      currentTrack: state.currentTrack,
      isPlaying: state.isPlaying,
      setIsPlaying: state.setIsPlaying,
      playNext: state.playNext,
      playPrevious: state.playPrevious,
    }),
    shallow
  );
  const [position] = useState({ x: window.innerWidth - 320, y: 100 });
  const [, setIsDragging] = useState(false);

  if (!currentTrack) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 9999,
      }}
      className="w-80 bg-dark-800/95 backdrop-blur-xl rounded-2xl border border-dark-600 shadow-2xl cursor-move"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-400 font-semibold">MINI PLAYER</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </motion.button>
        </div>

        <div className="flex items-center space-x-3 mb-4">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-2xl overflow-hidden flex-shrink-0"
          >
            {currentTrack.artwork ? (
              <img src={currentTrack.artwork} alt="" className="w-full h-full object-cover" />
            ) : (
              '🎵'
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">{currentTrack.title}</h3>
            <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={playPrevious}
            className="text-gray-400 hover:text-white p-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 rounded-full bg-primary-600 hover:bg-primary-700 flex items-center justify-center text-white"
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={playNext}
            className="text-gray-400 hover:text-white p-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
