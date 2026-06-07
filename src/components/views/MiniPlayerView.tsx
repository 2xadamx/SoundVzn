import React from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/player';
import { Play, Pause, SkipForward, SkipBack, X } from 'lucide-react';

export const MiniPlayerView: React.FC = () => {
    const {
        currentTrack,
        isPlaying,
        setIsPlaying,
        playNext,
        playPrevious,
        currentTime,
        duration,
    } = usePlayerStore();

    const togglePlay = () => setIsPlaying(!isPlaying);



    const handleClose = () => {
        (window as any).electron?.toggleMiniPlayer();
    };

    if (!currentTrack) {
        return (
            <div className="h-screen w-screen bg-black/90 flex flex-col items-center justify-center p-4 border border-white/10 overflow-hidden select-none drag">
                <p className="text-white/40 text-[10px] font-medium tracking-widest uppercase">SoundVzn Mini</p>
                <div className="absolute top-2 right-2 no-drag">
                    <button onClick={handleClose} className="text-white/20 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-black/80 backdrop-blur-xl border border-white/10 flex flex-col overflow-hidden select-none drag">
            {/* Header / Controls */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/5">
                <span className="text-[9px] font-bold text-white/30 tracking-widest uppercase">SoundVzn PiP</span>
                <div className="flex items-center gap-3 no-drag">
                    <button onClick={handleClose} className="text-white/30 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex items-center p-3 gap-3">
                {/* Album Art */}
                <div className="relative group">
                    <div className="w-16 h-16 rounded-lg overflow-hidden shadow-2xl border border-white/10">
                        <img
                            src={currentTrack.artwork}
                            alt={currentTrack.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Info & Controls */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                    <div className="no-drag">
                        <h4 className="text-[11px] font-bold text-white truncate drop-shadow-sm">
                            {currentTrack.title}
                        </h4>
                        <p className="text-[9px] font-medium text-white/50 truncate">
                            {currentTrack.artist}
                        </p>
                    </div>

                    <div className="flex items-center gap-4 no-drag pt-1">
                        <button onClick={() => playPrevious()} className="text-white/40 hover:text-white transition-colors">
                            <SkipBack size={14} />
                        </button>
                        <button
                            onClick={togglePlay}
                            className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 hover:scale-105 transition-transform"
                        >
                            {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
                        </button>
                        <button onClick={() => playNext()} className="text-white/40 hover:text-white transition-colors">
                            <SkipForward size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-white/5 relative no-drag group cursor-pointer overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    className="absolute inset-y-0 left-0 bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                />
            </div>

            {/* Ambient Shadow */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 to-transparent" />
        </div>
    );
};
