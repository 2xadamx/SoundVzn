import React from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/player';
import { HolographicArt } from '../player/HolographicArt';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import { shallow } from 'zustand/shallow';
import { CircularVisualizer } from '../player/CircularVisualizer';

interface ZenViewProps {
    onClose: () => void;
}

export const ZenView: React.FC<ZenViewProps> = ({ onClose }) => {
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-8 overflow-hidden"
        >
            {/* Background Atmosphere */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-30">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-to-tr from-primary-900/40 via-purple-900/20 to-transparent blur-[120px] animate-pulse" />
            </div>

            {/* Close Button */}
            <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="absolute top-12 right-12 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white z-50"
            >
                <X size={24} />
            </motion.button>

            <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row items-center gap-16">
                {/* Holographic Art + Visualizer */}
                <div className="w-full max-w-[450px] aspect-square shrink-0 relative flex items-center justify-center">
                    <CircularVisualizer isPlaying={isPlaying} size={550} />
                    <HolographicArt
                        src={currentTrack.artwork || ''}
                        alt={currentTrack.title}
                        isPlaying={isPlaying}
                        className="w-full h-full shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative z-10"
                    />
                </div>

                {/* Metadata & Controls */}
                <div className="flex-1 text-center md:text-left space-y-12">
                    <div className="space-y-4">
                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-tight"
                        >
                            {currentTrack.title}
                        </motion.h1>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-2xl md:text-3xl font-medium text-white/40"
                        >
                            {currentTrack.artist}
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center md:justify-start gap-8"
                    >
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={playPrevious}
                            className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                        >
                            <SkipBack size={32} />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:shadow-[0_0_70px_rgba(255,255,255,0.5)] transition-all"
                        >
                            {isPlaying ? <Pause size={48} fill="currentColor" /> : <Play size={48} className="ml-2" fill="currentColor" />}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={playNext}
                            className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                        >
                            <SkipForward size={32} />
                        </motion.button>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};
