import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@store/player';
import { AudioVisualizer } from './AudioVisualizer';
import { Activity, Disc, Info, Zap } from 'lucide-react';
import clsx from 'clsx';
import { shallow } from 'zustand/shallow';

export const Player: React.FC = () => {
  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const [activeRef, setActiveRef] = useState<'A' | 'B'>('A');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [showVisualizer, setShowVisualizer] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState<'bars' | 'waves' | 'circular' | 'particles'>('bars');

  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    audioSettings,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    playNext,
    playPrevious,
    checkScrobble,
  } = usePlayerStore(
    (state) => ({
      currentTrack: state.currentTrack,
      queue: state.queue,
      currentIndex: state.currentIndex,
      isPlaying: state.isPlaying,
      currentTime: state.currentTime,
      duration: state.duration,
      volume: state.volume,
      muted: state.muted,
      shuffle: state.shuffle,
      repeat: state.repeat,
      audioSettings: state.audioSettings,
      setIsPlaying: state.setIsPlaying,
      setCurrentTime: state.setCurrentTime,
      setDuration: state.setDuration,
      setVolume: state.setVolume,
      toggleMute: state.toggleMute,
      toggleShuffle: state.toggleShuffle,
      toggleRepeat: state.toggleRepeat,
      playNext: state.playNext,
      playPrevious: state.playPrevious,
      checkScrobble: state.checkScrobble,
    }),
    shallow
  );

  const crossfadeTime = audioSettings.crossfade || 0;
  const currentAudio = activeRef === 'A' ? audioRefA.current : audioRefB.current;
  const inactiveAudio = activeRef === 'A' ? audioRefB.current : audioRefA.current;
  const retryRef = useRef(0);

  // Handle Playback State & Src
  useEffect(() => {
    if (!currentAudio) return;

    const targetSrc = currentTrack?.filePath || '';
    if (currentAudio.src !== targetSrc) {
      currentAudio.src = targetSrc;
      currentAudio.preload = 'metadata';
      currentAudio.load();
    }

    if (isPlaying && targetSrc && !isTransitioning) {
      currentAudio.play().catch(() => { });
    } else if (!isPlaying) {
      currentAudio.pause();
    }
  }, [isPlaying, currentTrack?.id, currentTrack?.filePath, activeRef]);

  // Reset retry state when track changes
  useEffect(() => {
    retryRef.current = 0;
  }, [currentTrack?.id, currentTrack?.filePath]);

  // Preload next track into the inactive audio element to reduce lag
  useEffect(() => {
    if (!inactiveAudio) return;
    const nextTrack = queue[currentIndex + 1];
    const nextSrc = nextTrack?.filePath || '';
    if (!nextSrc) return;
    if (inactiveAudio.src !== nextSrc) {
      inactiveAudio.src = nextSrc;
      inactiveAudio.preload = 'metadata';
      inactiveAudio.load();
    }
  }, [queue, currentIndex, activeRef]);

  // Handle Global Volume & Mute
  useEffect(() => {
    if (audioRefA.current && audioRefB.current) {
      const baseVol = muted ? 0 : volume;
      // When transitioning, volume is handled by the crossfade loop
      if (!isTransitioning) {
        if (activeRef === 'A') {
          audioRefA.current.volume = baseVol;
          audioRefB.current.volume = 0;
        } else {
          audioRefB.current.volume = baseVol;
          audioRefA.current.volume = 0;
        }
      }
    }
  }, [volume, muted, activeRef, isTransitioning]);

  // Trigger Crossfade Logic
  useEffect(() => {
    if (!currentAudio || !isPlaying || isTransitioning || crossfadeTime <= 0) return;

    const timeUntilEnd = duration - currentTime;
    if (timeUntilEnd <= crossfadeTime && duration > 20) {
      startCrossfade();
    }
  }, [currentTime, duration, isPlaying, isTransitioning, crossfadeTime]);

  const startCrossfade = async () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const steps = 20;
    const interval = (crossfadeTime * 1000) / steps;
    const baseVol = muted ? 0 : volume;

    // Trigger playNext in store - this will update currentTrack
    await playNext();

    // Swap Refs
    setActiveRef(prev => prev === 'A' ? 'B' : 'A');

    let currentStep = 0;
    const fadeTimer = setInterval(() => {
      currentStep++;
      const ratio = currentStep / steps;

      if (audioRefA.current && audioRefB.current) {
        if (activeRef === 'A') {
          // B is becoming active
          audioRefA.current.volume = baseVol * (1 - ratio);
          audioRefB.current.volume = baseVol * ratio;
        } else {
          // A is becoming active
          audioRefB.current.volume = baseVol * (1 - ratio);
          audioRefA.current.volume = baseVol * ratio;
        }
      }

      if (currentStep >= steps) {
        clearInterval(fadeTimer);
        setIsTransitioning(false);
      }
    }, interval);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if ((activeRef === 'A' && audio === audioRefA.current) || (activeRef === 'B' && audio === audioRefB.current)) {
      setCurrentTime(audio.currentTime);
      checkScrobble();
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if ((activeRef === 'A' && audio === audioRefA.current) || (activeRef === 'B' && audio === audioRefB.current)) {
      setDuration(audio.duration);
    }
  };

  const retryStream = (audio: HTMLAudioElement) => {
    if (retryRef.current >= 2) return;
    const src = audio.currentSrc || audio.src;
    if (!src) return;
    retryRef.current += 1;
    const resumeTime = audio.currentTime || 0;
    const bust = src.includes('?') ? `${src}&retry=${Date.now()}` : `${src}?retry=${Date.now()}`;
    audio.src = bust;
    audio.load();
    const onReady = () => {
      try {
        audio.currentTime = resumeTime;
      } catch { }
      audio.play().catch(() => { });
    };
    audio.addEventListener('loadedmetadata', onReady, { once: true });
  };

  const handleEnded = () => {
    if (isTransitioning) return;
    if (repeat === 'one') {
      currentAudio?.play();
    } else {
      playNext();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (currentAudio) {
      currentAudio.currentTime = time;
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
      <div className="h-24 bg-[#08080a] border-t border-white/5 flex items-center justify-center font-inter">
        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] italic">SoundVizion Offline</p>
      </div>
    );
  }

  return (
    <>
      <audio
        ref={audioRefA}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={(e) => retryStream(e.currentTarget)}
        onStalled={(e) => retryStream(e.currentTarget)}
        crossOrigin="anonymous"
        preload="metadata"
      />
      <audio
        ref={audioRefB}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={(e) => retryStream(e.currentTarget)}
        onStalled={(e) => retryStream(e.currentTarget)}
        crossOrigin="anonymous"
        preload="metadata"
      />

      <AnimatePresence>
        {showVisualizer && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            className="bg-[#050508] border-t border-white/5 origin-bottom relative overflow-hidden z-50 h-[300px]"
          >
            <AudioVisualizer
              audioElement={currentAudio}
              isPlaying={isPlaying}
              mode={visualizerMode}
            />

            <div className="absolute top-8 right-8 flex flex-col gap-3 group">
              {(['bars', 'waves', 'circular', 'particles'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setVisualizerMode(mode)}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border outline-none",
                    visualizerMode === mode
                      ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                      : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowVisualizer(false)}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 hover:text-white hover:bg-white/10 transition-all outline-none"
            >
              Cerrar Visualizador
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-24 bg-[#08080a]/90 backdrop-blur-3xl border-t border-white/5 flex items-center px-8 relative z-[100] font-inter">
        {!currentTrack.isLive && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.02] group cursor-pointer overflow-visible">
            <div
              className="absolute left-0 top-0 h-full bg-primary-500 shadow-[0_0_10px_rgba(59,130,246,1)] transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-8 -top-4 opacity-0 cursor-pointer z-10"
            />
          </div>
        )}

        <div className="flex items-center gap-5 flex-1 min-w-0">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowVisualizer(!showVisualizer)}
            className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group cursor-pointer shadow-2xl"
          >
            {currentTrack.artwork ? (
              <img src={currentTrack.artwork} alt={currentTrack.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            ) : (
              <Disc size={20} className="text-white/20" />
            )}
            <div className="absolute inset-0 bg-primary-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Activity size={16} className="text-white animate-pulse" />
            </div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white text-sm font-bold truncate tracking-tight">{currentTrack.title}</h3>
            <div className="flex items-center gap-2 text-white/40">
              <p className="text-[11px] font-semibold truncate hover:text-white transition-colors cursor-pointer">{currentTrack.artist}</p>
              {currentTrack.format === 'FLAC' && (
                <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-sm uppercase tracking-tighter border border-amber-500/20">Lossless</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-[1.5] flex flex-col items-center gap-2">
          <div className="flex items-center gap-8">
            <button
              onClick={toggleShuffle}
              className={clsx(
                "p-2 rounded-full transition-all hover:scale-110 active:scale-90 outline-none",
                shuffle ? "text-primary-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "text-white/20 hover:text-white/60"
              )}
            >
              <Zap size={16} fill={shuffle ? "currentColor" : "none"} />
            </button>

            <button onClick={playPrevious} className="text-white/40 hover:text-white hover:scale-110 active:scale-90 transition-all outline-none">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all outline-none"
            >
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </motion.button>

            <button onClick={playNext} className="text-white/40 hover:text-white hover:scale-110 active:scale-90 transition-all outline-none">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            <button
              onClick={toggleRepeat}
              className={clsx(
                "p-2 rounded-full transition-all hover:scale-110 active:scale-90 outline-none",
                repeat !== 'off' ? "text-primary-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "text-white/20 hover:text-white/60"
              )}
            >
              <div className="relative">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-black">1</span>}
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono text-white/20 tracking-widest">{formatTime(currentTime)}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
            <span className="text-[9px] font-mono text-white/20 tracking-widest">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-end gap-6">
          <div className="hidden xl:flex flex-col items-end gap-1 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-2xl group cursor-help">
            <div className="flex items-center gap-2">
              <Info size={10} className="text-white/20 group-hover:text-primary-400 transition-colors" />
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                {currentTrack.format?.toUpperCase() || 'STREAM'}
              </span>
            </div>
            <p className="text-[8px] font-bold text-white/10 uppercase tracking-tighter">
              {currentTrack.bitrate ? `${currentTrack.bitrate} kbps` : 'Variable Bitrate'} • {currentTrack.sampleRate ? `${currentTrack.sampleRate / 1000} kHz` : '44.1 kHz'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleMute} className="text-white/30 hover:text-white transition-colors outline-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                {muted ? (
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                ) : (
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                )}
              </svg>
            </button>

            <div className="relative w-24 h-1 bg-white/5 rounded-full overflow-hidden group cursor-pointer">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-white/40 to-white/80 transition-all"
                style={{ width: `${volume * 100}%` }}
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
