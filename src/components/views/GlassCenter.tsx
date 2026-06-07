import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import {
    Play, Pause, SkipBack, SkipForward,
    Repeat as RepeatIcon, Shuffle, ChevronDown,
    Mic2, ListMusic
} from 'lucide-react';
import { usePlayerStore } from '../../store/player';
import { formatTime } from '../../utils/timeFormat';
import clsx from 'clsx';
import { shallow } from 'zustand/shallow';

/* ──────────────────────────────────────────────────────────────
   Comet background — organic, blurred, medium-small size
   Directions: from top-left area → bottom-right diagonally
   ────────────────────────────────────────────────────────────── */
const COMETS = [
    { delay: 0,    dur: 9,  top: '2%',   left: '-5%',  size: 2, trail: 120, opacity: 0.9  },
    { delay: 2.5,  dur: 12, top: '-8%',  left: '35%',  size: 3, trail: 160, opacity: 0.7  },
    { delay: 5,    dur: 8,  top: '25%',  left: '-15%', size: 2, trail: 100, opacity: 0.85 },
    { delay: 1.5,  dur: 15, top: '-15%', left: '60%',  size: 2, trail: 80,  opacity: 0.6  },
    { delay: 7,    dur: 10, top: '10%',  left: '-20%', size: 3, trail: 140, opacity: 0.75 },
    { delay: 4,    dur: 11, top: '-5%',  left: '80%',  size: 2, trail: 90,  opacity: 0.65 },
    { delay: 9,    dur: 14, top: '40%',  left: '-10%', size: 2, trail: 110, opacity: 0.55 },
];

const CometBackground = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes cometMove {
                0%   { transform: translate(0, 0) rotate(35deg); opacity: 0; }
                15%  { opacity: 1; }
                70%  { opacity: 1; }
                100% { transform: translate(120vw, 120vh) rotate(35deg); opacity: 0; }
            }
            .sv-comet {
                position: absolute;
                border-radius: 50%;
                animation: cometMove linear infinite;
            }
            .sv-comet::before {
                content: '';
                position: absolute;
                top: 50%;
                right: 100%;
                transform: translateY(-50%) rotate(0deg);
                height: 1px;
                background: linear-gradient(to right, transparent, rgba(200, 230, 255, 0.5));
                border-radius: 9999px;
                filter: blur(0.5px);
            }
        ` }} />
        {COMETS.map((c, i) => (
            <div key={i} className="sv-comet" style={{
                top: c.top,
                left: c.left,
                width: `${c.size}px`,
                height: `${c.size}px`,
                background: `radial-gradient(circle, rgba(220,240,255,${c.opacity}) 0%, rgba(140,200,255,0.4) 60%, transparent 100%)`,
                boxShadow: `0 0 ${c.size * 4}px ${c.size}px rgba(180,220,255,0.35), 0 0 ${c.size * 10}px ${c.size * 2}px rgba(100,180,255,0.12)`,
                animationDuration: `${c.dur}s`,
                animationDelay: `${c.delay}s`,
            }}>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    right: '100%',
                    transform: 'translateY(-50%)',
                    width: `${c.trail}px`,
                    height: `${Math.max(1, c.size * 0.5)}px`,
                    background: `linear-gradient(to right, transparent, rgba(180,220,255,0.55))`,
                    borderRadius: '9999px',
                    filter: 'blur(1px)',
                }} />
            </div>
        ))}
    </div>
);

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
        repeat,
        toggleRepeat,
        shuffle,
        toggleShuffle,
        setSeekTo,
        isLyricsOpen,
        setIsLyricsOpen,
        isQueueOpen,
        setIsQueueOpen,
        setIsGlassOpen,
    } = usePlayerStore(
        (state) => ({
            currentTrack: state.currentTrack,
            isPlaying: state.isPlaying,
            setIsPlaying: state.setIsPlaying,
            playNext: state.playNext,
            playPrevious: state.playPrevious,
            currentTime: state.currentTime,
            duration: state.duration,
            repeat: state.repeat,
            toggleRepeat: state.toggleRepeat,
            shuffle: state.shuffle,
            toggleShuffle: state.toggleShuffle,
            setSeekTo: state.setSeekTo,
            isLyricsOpen: state.isLyricsOpen,
            setIsLyricsOpen: state.setIsLyricsOpen,
            isQueueOpen: state.isQueueOpen,
            setIsQueueOpen: state.setIsQueueOpen,
            setIsGlassOpen: state.setIsGlassOpen,
        }),
        shallow
    );

    const [dragActive, setDragActive] = useState(false);

    // Exit fullscreen when closing
    const handleClose = async () => {
        setIsGlassOpen(false);
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
        } catch (e) {}
    };

    // Listen for ESC key to also close glass
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const handleDragEnd = (_: any, info: any) => {
        setDragActive(false);
        const { offset, velocity } = info;
        if (Math.abs(offset.y) > Math.abs(offset.x) && (offset.y > 50 || velocity.y > 500)) {
            handleClose();
        } else if (Math.abs(offset.x) > Math.abs(offset.y)) {
            if (offset.x > 50 || velocity.x > 500) playPrevious();
            else if (offset.x < -50 || velocity.x < -500) playNext();
        }
    };

    if (!currentTrack) return null;

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        setSeekTo(percent * duration);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-0 z-[200] overflow-hidden bg-black flex flex-col font-sans"
            style={{ height: '100dvh' }}
        >
            {/* ── Dynamic Ambient Background ── */}
            {currentTrack?.artwork && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <motion.div
                        className="absolute inset-[-20%] bg-cover bg-center blur-[90px] saturate-150"
                        style={{ backgroundImage: `url(${currentTrack.artwork})` }}
                        animate={{
                            scale: isPlaying ? [1, 1.04, 1] : 1,
                            opacity: isPlaying ? [0.25, 0.4, 0.25] : 0.3,
                        }}
                        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/95" />
                </div>
            )}

            <CometBackground />

            {/* ── Top Bar ── */}
            <div className="relative z-10 w-full flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5 shrink-0">
                {/* Close / chevron */}
                <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-white/60 hover:text-white transition-all backdrop-blur-xl flex items-center justify-center"
                >
                    <ChevronDown size={18} />
                </button>

                {/* Lyrics + Queue */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsLyricsOpen(!isLyricsOpen)}
                        className={clsx(
                            'w-8 h-8 rounded-full border transition-all backdrop-blur-xl flex items-center justify-center',
                            isLyricsOpen
                                ? 'bg-white/20 border-white/30 text-white'
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/12 hover:text-white'
                        )}
                        title="Letras"
                    >
                        <Mic2 size={15} />
                    </button>
                    <button
                        onClick={() => setIsQueueOpen(!isQueueOpen)}
                        className={clsx(
                            'w-8 h-8 rounded-full border transition-all backdrop-blur-xl flex items-center justify-center',
                            isQueueOpen
                                ? 'bg-white/20 border-white/30 text-white'
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/12 hover:text-white'
                        )}
                        title="Cola"
                    >
                        <ListMusic size={15} />
                    </button>
                </div>
            </div>

            {/* ── Main scrollable content ── */}
            <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.15}
                onDragStart={() => setDragActive(true)}
                onDragEnd={handleDragEnd}
                className="flex-1 w-full flex flex-col items-center justify-center px-6 sm:px-10 relative z-10 cursor-grab active:cursor-grabbing overflow-hidden"
                style={{ minHeight: 0 }}
            >
                {/* ── Artwork ── */}
                <motion.div
                    className="relative mb-7 sm:mb-9 rounded-[1.75rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl"
                    style={{
                        width: 'min(340px, 75vw, 42vh)',
                        aspectRatio: '1',
                    }}
                    animate={{
                        scale: dragActive ? 0.94 : (isPlaying ? 1 : 0.97),
                        boxShadow: isPlaying
                            ? '0 28px 60px -10px rgba(0,0,0,0.85)'
                            : '0 14px 30px -8px rgba(0,0,0,0.6)',
                    }}
                    transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                >
                    {currentTrack.artwork ? (
                        <img
                            src={currentTrack.artwork}
                            alt={currentTrack.title}
                            className="w-full h-full object-cover select-none pointer-events-none"
                            draggable={false}
                        />
                    ) : (
                        <div className="w-full h-full bg-white/8 flex items-center justify-center backdrop-blur-xl">
                            <Mic2 size={48} className="text-white/20" />
                        </div>
                    )}
                </motion.div>

                {/* ── Track Info ── */}
                <div className="w-full max-w-sm text-left mb-5 px-1">
                    <motion.h1
                        className="text-xl sm:text-2xl font-bold text-white truncate mb-0.5 leading-tight"
                        layoutId={`title-${currentTrack.id}`}
                    >
                        {currentTrack.title}
                    </motion.h1>
                    <motion.p
                        className="text-sm text-white/50 font-medium truncate"
                        layoutId={`artist-${currentTrack.id}`}
                    >
                        {currentTrack.artist}
                    </motion.p>
                </div>

                {/* ── Scrubber ── */}
                <div className="w-full max-w-sm px-1 mb-5">
                    <div
                        className="h-1 w-full bg-white/10 rounded-full overflow-hidden cursor-pointer group relative"
                        onClick={handleProgressClick}
                    >
                        <div
                            className="absolute top-0 left-0 bottom-0 bg-white/80 group-hover:bg-white rounded-full pointer-events-none transition-colors"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] font-medium text-white/35 tabular-nums">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* ── Controls ── */}
                <div className="w-full max-w-sm flex items-center justify-between px-1">
                    {/* Shuffle */}
                    <button
                        onClick={toggleShuffle}
                        className={clsx(
                            'w-8 h-8 rounded-full border transition-all flex items-center justify-center',
                            shuffle
                                ? 'bg-white/15 border-white/25 text-white'
                                : 'bg-transparent border-transparent text-white/30 hover:text-white/60'
                        )}
                    >
                        <Shuffle size={15} />
                    </button>

                    {/* Prev + Play + Next */}
                    <div className="flex items-center gap-5 sm:gap-6">
                        <button
                            onClick={playPrevious}
                            className="text-white/60 hover:text-white hover:scale-110 active:scale-90 transition-all"
                        >
                            <SkipBack size={22} fill="currentColor" />
                        </button>

                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white/12 backdrop-blur-xl border border-white/18 text-white flex items-center justify-center hover:bg-white/20 hover:scale-105 active:scale-95 transition-all shadow-[0_0_24px_rgba(255,255,255,0.08)]"
                            style={{ width: '3.25rem', height: '3.25rem' }}
                        >
                            {isPlaying
                                ? <Pause size={22} fill="currentColor" />
                                : <Play size={22} fill="currentColor" className="ml-0.5" />
                            }
                        </button>

                        <button
                            onClick={playNext}
                            className="text-white/60 hover:text-white hover:scale-110 active:scale-90 transition-all"
                        >
                            <SkipForward size={22} fill="currentColor" />
                        </button>
                    </div>

                    {/* Repeat */}
                    <button
                        onClick={toggleRepeat}
                        className={clsx(
                            'w-8 h-8 rounded-full border transition-all relative flex items-center justify-center',
                            repeat !== 'off'
                                ? 'bg-white/15 border-white/25 text-white'
                                : 'bg-transparent border-transparent text-white/30 hover:text-white/60'
                        )}
                    >
                        <RepeatIcon size={15} />
                        {repeat === 'one' && (
                            <span className="absolute -top-1 -right-1 text-[7px] font-black bg-white text-black w-3 h-3 rounded-full flex items-center justify-center">
                                1
                            </span>
                        )}
                    </button>
                </div>
            </motion.div>

            {/* ── bottom safe area padding ── */}
            <div className="h-4 sm:h-6 shrink-0 relative z-10" />
        </motion.div>
    );
};
