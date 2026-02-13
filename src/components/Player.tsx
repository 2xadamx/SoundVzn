import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@store/player';
import { AudioVisualizer } from './AudioVisualizer';

export const Player: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState<'bars' | 'waves' | 'circular' | 'particles'>('bars');
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    playNext,
    playPrevious,
  } = usePlayerStore();

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (repeat === 'one') {
      audioRef.current?.play();
    } else {
      playNext();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) {
    return (
      <div className="h-24 bg-dark-800 border-t border-dark-600 flex items-center justify-center">
        <p className="text-gray-500 text-sm">No hay música reproduciéndose</p>
      </div>
    );
  }

  return (
    <>
      {showVisualizer && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 300 }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-dark-900 border-t border-dark-600 relative overflow-hidden"
        >
          <AudioVisualizer
            audioElement={audioRef.current}
            isPlaying={isPlaying}
            mode={visualizerMode}
          />
          
          <div className="absolute top-4 right-4 flex space-x-2">
            {(['bars', 'waves', 'circular', 'particles'] as const).map((mode) => (
              <motion.button
                key={mode}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setVisualizerMode(mode)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  visualizerMode === mode
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-800/50 text-gray-400 hover:text-white backdrop-blur-xl'
                }`}
              >
                {mode}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
      
      <div className="h-24 bg-dark-800 border-t border-dark-600 flex items-center px-6">
        <audio
          ref={audioRef}
          src={currentTrack.filePath}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />

        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-2xl overflow-hidden cursor-pointer"
            onClick={() => setShowVisualizer(!showVisualizer)}
          >
            {currentTrack.artwork ? (
              <img src={currentTrack.artwork} alt={currentTrack.title} className="w-full h-full object-cover" />
            ) : (
              '🎵'
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{currentTrack.title}</h3>
            <p className="text-gray-400 text-sm truncate">{currentTrack.artist}</p>
          </div>
        </div>

      <div className="flex-1 flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleShuffle}
            className={`p-2 rounded-full ${shuffle ? 'text-primary-500' : 'text-gray-400 hover:text-white'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={playPrevious}
            className="text-gray-400 hover:text-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 rounded-full bg-primary-600 hover:bg-primary-700 flex items-center justify-center text-white"
          >
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={playNext}
            className="text-gray-400 hover:text-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleRepeat}
            className={`p-2 rounded-full ${repeat !== 'off' ? 'text-primary-500' : 'text-gray-400 hover:text-white'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              {repeat === 'one' && <circle cx="12" cy="12" r="2" />}
            </svg>
          </motion.button>
        </div>

        <div className="w-full max-w-2xl flex items-center space-x-3">
          <span className="text-xs text-gray-400 min-w-[40px]">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-dark-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 hover:[&::-webkit-slider-thumb]:bg-primary-400"
          />
          <span className="text-xs text-gray-400 min-w-[40px]">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-end space-x-3">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleMute}
          className="text-gray-400 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {muted ? (
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            ) : (
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            )}
          </svg>
        </motion.button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-24 h-1 bg-dark-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
        />

        <div className="text-xs text-gray-400 bg-dark-700 px-3 py-1 rounded-full">
          {currentTrack.format?.toUpperCase()} • {currentTrack.sampleRate ? `${currentTrack.sampleRate / 1000}kHz` : '44.1kHz'}
        </div>
      </div>
    </div>
    </>
  );
};
