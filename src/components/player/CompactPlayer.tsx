import React from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/player';
import { Play, Pause, SkipForward, SkipBack, X, Maximize2 } from 'lucide-react';
import { shallow } from 'zustand/shallow';

interface CompactPlayerProps {
    onClose: () => void;
    onExpand: () => void;
}

export const CompactPlayer: React.FC<CompactPlayerProps> = ({ onClose, onExpand }) => {
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

    if (!currentTrack) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-8 right-8 z-[100] w-72 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-4 shadow-2xl flex items-center gap-4 group"
        >
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 relative">
                <img
                    src={typeof currentTrack.artwork === 'string' ? currentTrack.artwork : (currentTrack.artwork as any)?.small || (currentTrack.artwork as any)?.medium || ''}
                    className="w-full h-full object-cover"
                    alt=""
                />
                <div className="absolute inset-0 bg-black/20" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white truncate leading-tight">{currentTrack.title}</p>
                <p className="text-[10px] text-white/40 truncate mt-0.5">{currentTrack.artist}</p>

                <div className="flex items-center gap-3 mt-2">
                    <button onClick={playPrevious} className="text-white/40 hover:text-white transition-colors">
                        <SkipBack size={14} fill="currentColor" />
                    </button>
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform"
                    >
                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button onClick={playNext} className="text-white/40 hover:text-white transition-colors">
                        <SkipForward size={14} fill="currentColor" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onExpand}
                    className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
                >
                    <Maximize2 size={14} />
                </button>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-red-400 transition-all"
                >
                    <X size={14} />
                </button>
            </div>
        </motion.div>
    );
};
