import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, SkipBack, SkipForward, Play, Pause, Heart } from 'lucide-react';
import { usePlayerStore } from '../../store/player';
import { shallow } from 'zustand/shallow';
import { LyricsEngine } from '../../utils/LyricsEngine';

const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const LyricsView: React.FC = () => {
    const {
        currentTrack, isPlaying, setIsPlaying,
        playNext, playPrevious, currentTime, duration,
        setSeekTo, setIsLyricsOpen, toggleFavorite
    } = usePlayerStore(
        (state) => ({
            currentTrack: state.currentTrack,
            isPlaying: state.isPlaying,
            setIsPlaying: state.setIsPlaying,
            playNext: state.playNext,
            playPrevious: state.playPrevious,
            currentTime: state.currentTime,
            duration: state.duration,
            setSeekTo: state.setSeekTo,
            setIsLyricsOpen: state.setIsLyricsOpen,
            toggleFavorite: state.toggleFavorite,
        }),
        shallow
    );

    const scrollRef = useRef<HTMLDivElement>(null);
    const linesRef = useRef<(HTMLParagraphElement | null)[]>([]);
    const [lyrics, setLyrics] = useState<{ time: number; text: string }[]>([]);
    const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [artworkColor, setArtworkColor] = useState('20,20,30');

    // Extract dominant color
    useEffect(() => {
        if (!currentTrack?.artwork) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = typeof currentTrack.artwork === 'string' ? currentTrack.artwork : '';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 8; canvas.height = 8;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, 8, 8);
                const data = ctx.getImageData(0, 0, 8, 8).data;
                let r = 0, g = 0, b = 0;
                for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
                const n = data.length / 4;
                setArtworkColor(`${Math.floor(r / n)},${Math.floor(g / n)},${Math.floor(b / n)}`);
            } catch { setArtworkColor('20,20,30'); }
        };
    }, [currentTrack?.artwork]);

    // Fetch lyrics
    useEffect(() => {
        if (!currentTrack) return;
        let cancelled = false;
        setIsLoadingLyrics(true);
        setLyrics([]);
        setActiveIdx(-1);
        LyricsEngine.fetchLyrics(currentTrack.artist, currentTrack.title, duration)
            .then(data => { if (!cancelled) setLyrics(data); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setIsLoadingLyrics(false); });
        return () => { cancelled = true; };
    }, [currentTrack?.id, duration]);

    // Sync active line
    useEffect(() => {
        if (lyrics.length === 0) return;
        let frameId: number;
        let running = true;
        const tick = () => {
            if (!running) return;
            const time = usePlayerStore.getState().currentTime;
            let idx = -1;
            for (let i = 0; i < lyrics.length; i++) {
                if (time >= lyrics[i].time && (!lyrics[i + 1] || time < lyrics[i + 1].time)) { idx = i; break; }
            }
            setActiveIdx(prev => prev !== idx ? idx : prev);
            if (idx !== -1 && scrollRef.current && linesRef.current[idx]) {
                const el = linesRef.current[idx];
                if (el) {
                    const target = el.offsetTop - scrollRef.current.offsetHeight / 2 + el.offsetHeight / 2;
                    scrollRef.current.scrollTop += (target - scrollRef.current.scrollTop) * 0.08;
                }
            }
            frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
        return () => { running = false; cancelAnimationFrame(frameId); };
    }, [lyrics]);

    if (!currentTrack) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const artwork = typeof currentTrack.artwork === 'string' ? currentTrack.artwork : '';

    return (
        <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[350] overflow-hidden"
            style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(${artworkColor},0.5) 0%, transparent 70%), rgb(5,5,8)` }}
        >
            {/* Background blur */}
            {artwork && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <img src={artwork} className="absolute inset-0 w-full h-full object-cover opacity-[0.08] blur-[100px] scale-150" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
                </div>
            )}

            {/* ── MOBILE LAYOUT (single column, like Apple Music) ── */}
            <div className="sm:hidden relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-12 pb-4 shrink-0">
                    <button onClick={() => setIsLyricsOpen(false)}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <ChevronDown size={20} className="text-white/70" />
                    </button>
                    <div className="text-center">
                        <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Letras</p>
                    </div>
                    <div className="w-10" />
                </div>

                {/* Artwork */}
                <div className="px-8 pb-5 shrink-0">
                    <motion.div
                        animate={{ boxShadow: isPlaying ? `0 20px 60px rgba(${artworkColor},0.5)` : '0 10px_30px rgba(0,0,0,0.5)' }}
                        className="w-full aspect-square rounded-[28px] overflow-hidden"
                    >
                        {artwork
                            ? <img src={artwork} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full bg-white/5" />
                        }
                    </motion.div>
                </div>

                {/* Track info */}
                <div className="px-8 pb-4 shrink-0 flex items-center justify-between">
                    <div className="min-w-0">
                        <h2 className="text-xl font-black text-white truncate tracking-tight">{currentTrack.title}</h2>
                        <p className="text-sm text-white/50 truncate mt-0.5">{currentTrack.artist}</p>
                    </div>
                    <button onClick={() => toggleFavorite()}
                        className={`w-9 h-9 flex items-center justify-center shrink-0 ${currentTrack.favorite ? 'text-rose-400' : 'text-white/30'}`}>
                        <Heart size={20} className={currentTrack.favorite ? 'fill-current' : ''} />
                    </button>
                </div>

                {/* Progress */}
                <div className="px-8 pb-4 shrink-0 space-y-2">
                    <div className="relative h-1 bg-white/10 rounded-full cursor-pointer"
                        onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setSeekTo(((e.clientX - r.left) / r.width) * duration); }}>
                        <motion.div className="absolute left-0 top-0 h-full bg-white rounded-full"
                            animate={{ width: `${progress}%` }} transition={{ type: 'tween', duration: 0.1 }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-white/30">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="px-8 pb-4 shrink-0 flex items-center justify-between">
                    <button onClick={playPrevious} className="p-2 text-white/50 active:scale-90 transition-all">
                        <SkipBack size={28} fill="currentColor" />
                    </button>
                    <motion.button whileTap={{ scale: 0.93 }} onClick={() => setIsPlaying(!isPlaying)}
                        className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl">
                        {isPlaying ? <Pause size={28} fill="currentColor" strokeWidth={0} /> : <Play size={28} fill="currentColor" strokeWidth={0} className="ml-1" />}
                    </motion.button>
                    <button onClick={playNext} className="p-2 text-white/50 active:scale-90 transition-all">
                        <SkipForward size={28} fill="currentColor" />
                    </button>
                </div>

                {/* Lyrics scroll */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 pb-24 space-y-5" style={{ scrollbarWidth: 'none', maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 90%, transparent 100%)' }}>
                    {isLoadingLyrics ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
                        </div>
                    ) : lyrics.length === 0 ? (
                        <div className="text-center py-12 text-white/20 text-sm">Sin letras disponibles</div>
                    ) : lyrics.map((line, i) => {
                        const isActive = i === activeIdx;
                        const isPast = i < activeIdx;
                        return (
                            <motion.p key={i} ref={el => linesRef.current[i] = el}
                                animate={{ opacity: isActive ? 1 : isPast ? 0.3 : 0.12, scale: isActive ? 1.01 : 0.98 }}
                                transition={{ duration: 0.3 }}
                                onClick={() => setSeekTo(line.time)}
                                className="text-2xl font-black leading-snug tracking-tight text-white cursor-pointer">
                                {line.text}
                            </motion.p>
                        );
                    })}
                </div>
            </div>

            {/* ── DESKTOP LAYOUT (two columns) ── */}
            <div className="hidden sm:flex h-full">
                {/* Close button */}
                <button onClick={() => setIsLyricsOpen(false)}
                    className="absolute top-8 left-8 z-40 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    <ChevronDown size={22} />
                </button>

                {/* Left: Lyrics */}
                <div className="flex-1 relative z-10 flex flex-col overflow-hidden pt-24 pb-10">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto pb-[30vh] px-16 space-y-8"
                        style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 85%, transparent 100%)', scrollbarWidth: 'none' }}>
                        {isLoadingLyrics ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 pt-32">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                    className="w-6 h-6 border-2 border-white/10 border-t-white/60 rounded-full" />
                                <p className="text-white/20 text-[10px] font-black tracking-[0.3em] uppercase">Cargando letras</p>
                            </div>
                        ) : lyrics.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 pt-32 gap-4">
                                <p className="text-2xl font-black italic tracking-tighter">Sin letras disponibles</p>
                            </div>
                        ) : lyrics.map((line, i) => {
                            const isActive = i === activeIdx;
                            const isPast = i < activeIdx;
                            return (
                                <motion.p key={i} ref={el => linesRef.current[i] = el}
                                    animate={{ opacity: isActive ? 1 : isPast ? 0.25 : 0.07, scale: isActive ? 1.02 : 0.97 }}
                                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                    onClick={() => setSeekTo(line.time)}
                                    className="text-3xl md:text-5xl font-black leading-tight tracking-tighter cursor-pointer select-none text-white">
                                    {line.text}
                                </motion.p>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Artwork + Controls */}
                <div className="w-[380px] md:w-[420px] relative z-20 flex flex-col items-center justify-center pb-10 px-8 gap-8 flex-shrink-0">
                    <motion.div className="relative w-full aspect-square rounded-3xl overflow-hidden"
                        animate={{ boxShadow: isPlaying ? `0 30px 80px rgba(${artworkColor},0.4)` : '0 20px 50px rgba(0,0,0,0.5)' }}
                        style={{ maxWidth: 320, margin: '0 auto' }}>
                        {artwork ? <img src={artwork} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full bg-white/5" />}
                    </motion.div>
                    <div className="w-full text-center space-y-1">
                        <h2 className="text-2xl font-black text-white tracking-tight truncate">{currentTrack.title}</h2>
                        <p className="text-sm text-white/40 font-bold uppercase tracking-widest truncate">{currentTrack.artist}</p>
                    </div>
                    <div className="w-full space-y-2">
                        <div className="relative h-1 w-full bg-white/10 rounded-full cursor-pointer"
                            onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setSeekTo(((e.clientX - r.left) / r.width) * duration); }}>
                            <motion.div className="absolute left-0 top-0 h-full bg-white rounded-full"
                                animate={{ width: `${progress}%` }} transition={{ type: 'tween', duration: 0.1 }} />
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-white/20 tracking-widest">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between w-full px-4">
                        <button onClick={() => toggleFavorite()}
                            className={`p-3 rounded-full transition-all ${currentTrack.favorite ? 'text-red-400' : 'text-white/20 hover:text-white'}`}>
                            <Heart size={22} className={currentTrack.favorite ? 'fill-current' : ''} />
                        </button>
                        <button onClick={playPrevious} className="p-3 text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90">
                            <SkipBack size={26} fill="currentColor" />
                        </button>
                        <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-[0_10px_40px_rgba(255,255,255,0.2)]">
                            {isPlaying ? <Pause size={28} fill="currentColor" strokeWidth={0} /> : <Play size={28} fill="currentColor" strokeWidth={0} className="ml-1" />}
                        </motion.button>
                        <button onClick={playNext} className="p-3 text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90">
                            <SkipForward size={26} fill="currentColor" />
                        </button>
                        <div className="w-10" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
