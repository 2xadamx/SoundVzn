import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/player';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Heart } from 'lucide-react';
import React from 'react';
import clsx from 'clsx';
import { shallow } from 'zustand/shallow';

interface GlassCenterProps {
    onNavigate?: (view: string, params?: any) => void;
}

export const GlassCenter: React.FC<GlassCenterProps> = ({ onNavigate }) => {
    const {
        currentTrack,
        isPlaying,
        setIsPlaying,
        playNext,
        playPrevious,
        currentTime,
        duration,
        toggleFavorite,
        repeat,
        shuffle,
        toggleRepeat,
        toggleShuffle
    } = usePlayerStore(
        (state) => ({
            currentTrack: state.currentTrack,
            isPlaying: state.isPlaying,
            setIsPlaying: state.setIsPlaying,
            playNext: state.playNext,
            playPrevious: state.playPrevious,
            currentTime: state.currentTime,
            duration: state.duration,
            toggleFavorite: state.toggleFavorite,
            repeat: state.repeat,
            shuffle: state.shuffle,
            toggleRepeat: state.toggleRepeat,
            toggleShuffle: state.toggleShuffle,
        }),
        shallow
    );

    if (!currentTrack) return null;

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 relative">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-16 z-10"
            >
                {/* Large Album Art with Glow */}
                <div className="relative group shrink-0">
                    <motion.div
                        animate={{
                            boxShadow: isPlaying ? [
                                "0 0 40px rgba(var(--color-primary-rgb), 0.2)",
                                "0 0 80px rgba(var(--color-primary-rgb), 0.4)",
                                "0 0 40px rgba(var(--color-primary-rgb), 0.2)"
                            ] : "0 0 40px rgba(0,0,0,0.5)"
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="w-80 h-80 lg:w-[450px] lg:h-[450px] rounded-[60px] overflow-hidden border border-white/20 relative shadow-2xl"
                    >
                        {currentTrack.artwork ? (
                            <img
                                src={currentTrack.artwork}
                                alt={currentTrack.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                            />
                        ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <span className="text-white/10 text-9xl font-black">SV</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>

                    {/* Subtle Artistic badge */}
                    <div className="absolute -top-4 -right-4 px-6 py-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl">
                        <span className="text-[10px] font-bold text-white/40 tracking-[0.3em] uppercase italic">Pure Fidelity</span>
                    </div>
                </div>

                {/* Info & Advanced Controls */}
                <div className="flex-1 text-center lg:text-left space-y-8 min-w-0">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-start">
                        <div className="space-y-8">
                            <div>
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="flex items-center justify-center lg:justify-start gap-3 mb-4"
                                >
                                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold tracking-widest uppercase">
                                        Now Spinning
                                    </span>
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                                </motion.div>

                                <h1 className="text-5xl lg:text-7xl font-black text-white italic tracking-tighter mb-4 line-clamp-2 leading-none">
                                    {currentTrack.title}
                                </h1>
                                <p className="text-2xl text-white/40 font-bold italic tracking-tight truncate">
                                    {currentTrack.artist}
                                </p>
                            </div>

                            {/* Progress Bar Premium */}
                            <div className="space-y-4">
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-primary to-secondary relative"
                                        animate={{ width: `${progress}%` }}
                                        transition={{ type: "spring", stiffness: 50 }}
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] font-bold text-white/30 font-mono tracking-widest">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Technical Insights - Removed for Rolls Royce simplicity */}
                    </div>

                    {/* Pro Controls */}
                    <div className="flex items-center justify-center lg:justify-start gap-12">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={playPrevious}
                            className="text-white/40 hover:text-white transition-all"
                        >
                            <SkipBack size={32} fill="currentColor" />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-20 h-20 rounded-[30px] bg-white text-dark-950 flex items-center justify-center shadow-xl shadow-white/10 hover:shadow-white/20 transition-all"
                        >
                            {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1.5" />}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={playNext}
                            className="text-white/40 hover:text-white transition-all"
                        >
                            <SkipForward size={32} fill="currentColor" />
                        </motion.button>
                    </div>

                    <div className="flex items-center justify-center lg:justify-start gap-6 pt-4">
                        <button
                            onClick={toggleShuffle}
                            className={clsx(
                                "p-3 rounded-2xl border transition-all",
                                shuffle ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)]" : "bg-white/5 border-white/10 text-white/30"
                            )}
                        >
                            <Shuffle size={20} />
                        </button>
                        <button
                            onClick={toggleRepeat}
                            className={clsx(
                                "p-3 rounded-2xl border transition-all relative",
                                repeat !== 'off' ? "bg-secondary/20 border-secondary/50 text-secondary shadow-[0_0_20px_rgba(var(--color-secondary-rgb),0.3)]" : "bg-white/5 border-white/10 text-white/30"
                            )}
                        >
                            <Repeat size={20} />
                            {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-secondary text-white w-4 h-4 rounded-full flex items-center justify-center">1</span>}
                        </button>
                        <button
                            onClick={toggleFavorite}
                            className={clsx(
                                "p-3 rounded-2xl border transition-all",
                                currentTrack.favorite ? "bg-red-500/20 border-red-500/50 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]" : "bg-white/5 border-white/10 text-white/30"
                            )}
                        >
                            <Heart size={20} fill={currentTrack.favorite ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={() => onNavigate?.('home')}
                            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-all flex items-center gap-2"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2">Salir de Inmersión</span>
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Ambient Overlay - Removed for clean Rolls Royce look */}
        </div>
    );
};
