import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/player';
import { shallow } from 'zustand/shallow';
import { LyricsEngine, LyricLine } from '../../utils/LyricsEngine';
import { Layout, Focus as FocusIcon, Music2, ChevronDown, Monitor, Sparkles, Volume2 } from 'lucide-react';
import clsx from 'clsx';

interface LyricsViewProps {
    className?: string;
}

type LyricsMode = 'cinema' | 'focus' | 'flow' | 'karaoke';

export const LyricsView: React.FC<LyricsViewProps> = ({ className }) => {
    const { currentTime, currentTrack, isLyricsOpen, setIsLyricsOpen } = usePlayerStore(
        (state) => ({
            currentTime: state.currentTime,
            currentTrack: state.currentTrack,
            isLyricsOpen: state.isLyricsOpen,
            setIsLyricsOpen: state.setIsLyricsOpen,
        }),
        shallow
    );

    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [mode, setMode] = useState<LyricsMode>('cinema');
    const [isLoading, setIsLoading] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Reset lyrics when track changes
    useEffect(() => {
        setLyrics([]);
        setIsLoading(false);
    }, [currentTrack?.id]);

    useEffect(() => {
        if (!currentTrack || !isLyricsOpen) return;
        let cancelled = false;
        setIsLoading(true);
        LyricsEngine.fetchLyrics(currentTrack.artist, currentTrack.title, currentTrack.duration)
            .then(res => { if (!cancelled) { setLyrics(res); setIsLoading(false); } })
            .catch(() => { if (!cancelled) { setLyrics([]); setIsLoading(false); } });
        return () => { cancelled = true; };
    }, [currentTrack?.id, isLyricsOpen]);

    const activeIndex = useMemo(() => {
        if (lyrics.length === 0) return -1;
        const index = lyrics.findIndex((line, i) => {
            const nextLine = lyrics[i + 1];
            return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
        });
        return index !== -1 ? index : (currentTime > lyrics[lyrics.length - 1].time ? lyrics.length - 1 : 0);
    }, [lyrics, currentTime]);

    useEffect(() => {
        if (scrollRef.current && mode !== 'focus') {
            const activeElement = scrollRef.current.querySelector(`[data-index="${activeIndex}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }
    }, [activeIndex, mode]);

    if (!currentTrack) return null;

    const artwork = currentTrack.artwork;

    return (
        <div
            className={clsx(
                "fixed inset-0 z-[100] flex flex-col transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
                !isLyricsOpen && "pointer-events-none opacity-0 translate-y-full blur-2xl",
                isLyricsOpen && "opacity-100 translate-y-0 blur-0",
                "bg-[#020204]",
                className
            )}
        >
            {/* NOISE OVERLAY */}
            <div className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

            {/* IMMERSIVE BACKGROUND */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 z-0"
                >
                    {artwork ? (
                        <>
                            <motion.img
                                initial={{ scale: 1.3, rotate: -2 }}
                                animate={{ scale: 1.5, rotate: 0 }}
                                transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', ease: "linear" }}
                                src={typeof artwork === 'string' ? artwork : ((artwork as any).large || (artwork as any).medium)}
                                className="w-full h-full object-cover blur-[120px] opacity-40"
                                alt=""
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#050508] to-black" />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* HEADER CONTROLS */}
            <div className="absolute top-12 left-10 right-10 z-[110] flex items-center justify-between no-drag">
                <div className="flex items-center gap-6">
                    <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsLyricsOpen(false)}
                        className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all shadow-2xl"
                    >
                        <ChevronDown size={22} strokeWidth={2} />
                    </motion.button>
                    
                    <div className="flex flex-col">
                        <motion.h3 
                            layoutId="lyric-track-title"
                            className="text-white font-black text-2xl tracking-tighter leading-none mb-1 shadow-black/20"
                        >
                            {currentTrack.title}
                        </motion.h3>
                        <div className="flex items-center gap-3">
                            <span className="text-white/30 font-bold text-[10px] uppercase tracking-[0.3em]">{currentTrack.artist}</span>
                            <div className="h-[1px] w-6 bg-white/10" />
                            <div className="flex items-center gap-1.5 text-primary/50 text-[9px] font-black uppercase tracking-widest">
                                <Volume2 size={10} /> Live Audio
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 p-1.5 bg-white/[0.03] backdrop-blur-3xl rounded-[24px] border border-white/10 shadow-3xl">
                    <LyricsModeBtn active={mode === 'cinema'} onClick={() => setMode('cinema')} icon={Monitor} label="Cinema" />
                    <LyricsModeBtn active={mode === 'focus'} onClick={() => setMode('focus')} icon={FocusIcon} label="Focus" />
                    <LyricsModeBtn active={mode === 'flow'} onClick={() => setMode('flow')} icon={Layout} label="Flow" />
                    <LyricsModeBtn active={mode === 'karaoke'} onClick={() => setMode('karaoke')} icon={Sparkles} label="Karaoke" />
                </div>
            </div>

            {/* MAIN LYRICS ENGINE CONTAINER */}
            <div
                ref={scrollRef}
                className={clsx(
                    "flex-1 relative z-10 overflow-y-auto scrollbar-hide px-10 lg:px-48 pb-[30vh] transition-all duration-700",
                    mode === 'cinema' ? "pt-[45vh]" : "pt-44"
                )}
                style={{
                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)'
                }}
            >
                {isLoading ? (
                    <div className="h-[40vh] flex flex-col items-center justify-center gap-5">
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            className="w-8 h-8 border-[3px] border-white/5 border-t-white/40 rounded-full" 
                        />
                        <p className="text-white/10 font-black uppercase tracking-[0.5em] text-[9px]">Sincronizando Archivos...</p>
                    </div>
                ) : (
                    <div className={clsx(
                        "flex flex-col",
                        mode === 'cinema' ? "gap-20 items-center text-center" : "gap-10 items-start"
                    )}>
                        {lyrics.length === 0 ? (
                            <div className="w-full text-center py-32">
                                <Music2 size={40} className="mx-auto text-white/5 mb-8" />
                                <h2 className="text-white/10 font-black text-3xl tracking-tighter uppercase italic mb-2">Instrumental Mode</h2>
                                <p className="text-white/5 text-[10px] uppercase tracking-[0.4em] font-bold">Disfruta de la composición acústica</p>
                            </div>
                        ) : lyrics.map((line, index) => {
                            const isActive = index === activeIndex;
                            const isPast = index < activeIndex;

                            if (mode === 'focus' && !isActive) return null;

                            return (
                                <motion.div
                                    key={`${currentTrack.id}-${index}`}
                                    data-index={index}
                                    initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                                    animate={{
                                        opacity: isActive ? 1 : (isPast ? 0.35 : 0.08),
                                        scale: isActive ? 1 : 0.94,
                                        filter: isActive ? 'blur(0px)' : (mode === 'cinema' ? 'blur(4px)' : 'blur(0px)'),
                                        y: isActive ? 0 : 0
                                    }}
                                    transition={{ 
                                        duration: 0.9, 
                                        ease: [0.16, 1, 0.3, 1],
                                        opacity: { duration: 0.6 },
                                        filter: { type: "tween", duration: 0.5 }
                                    }}
                                    className={clsx(
                                        "font-black tracking-tighter leading-[1.1] select-none cursor-pointer group relative",
                                        mode === 'cinema' ? "text-5xl lg:text-7xl max-w-5xl" : "text-4xl lg:text-5xl",
                                    )}
                                    onClick={() => usePlayerStore.getState().setSeekTo(line.time)}
                                >
                                    <span className={clsx(
                                        "transition-all duration-700 block",
                                        isActive 
                                            ? "text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" 
                                            : "text-white/10 group-hover:text-white/40"
                                    )}>
                                        {line.text}
                                    </span>
                                    
                                    {isActive && (
                                        <motion.div 
                                            layoutId="active-line-indicator"
                                            className="absolute -left-12 top-1/2 -translate-y-1/2 w-8 h-1 bg-white/20 rounded-full blur-sm"
                                        />
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* BOTTOM BAR: Progress & Info */}
            <div className="absolute bottom-10 left-10 right-10 z-[110] flex items-center justify-between pointer-events-none">
                <div className="text-white/5 font-black text-[9px] tracking-[0.6em] uppercase">
                    SVZN ARCHIVE · HI-RES LOSSLESS
                </div>
                
                <div className="flex items-center gap-4 text-white/20 font-mono text-[10px] tracking-widest">
                    <span>{currentTrack.id?.substring(0, 8)}</span>
                    <div className="w-[1px] h-3 bg-white/10" />
                    <span>EMBEDDED LYRICS</span>
                </div>
            </div>
        </div>
    );
};

const LyricsModeBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ElementType; label: string }> = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-2 px-5 py-2.5 rounded-[18px] transition-all duration-700 group",
            active 
                ? "bg-white text-black shadow-2xl scale-100" 
                : "text-white/25 hover:text-white hover:bg-white/[0.04]"
        )}
    >
        <Icon size={15} strokeWidth={active ? 3 : 2} className="transition-transform duration-500 group-hover:scale-110" />
        <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
    </button>
);
