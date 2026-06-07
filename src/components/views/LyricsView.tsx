import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, MessageSquare, SkipBack, SkipForward, Play, Pause, Heart } from 'lucide-react';
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
    const [artworkColor, setArtworkColor] = useState('0,0,0');

    // Extract dominant color from artwork for dynamic background
    useEffect(() => {
        if (!currentTrack?.artwork) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = currentTrack.artwork;
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 10; canvas.height = 10;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, 10, 10);
                const data = ctx.getImageData(0, 0, 10, 10).data;
                let r = 0, g = 0, b = 0;
                for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
                const count = data.length / 4;
                setArtworkColor(`${Math.floor(r / count)},${Math.floor(g / count)},${Math.floor(b / count)}`);
            } catch {
                setArtworkColor('30,30,40');
            }
        };
    }, [currentTrack?.artwork]);

    useEffect(() => {
        const fetch = async () => {
            if (!currentTrack) return;
            setIsLoadingLyrics(true);
            setLyrics([]);
            setActiveIdx(-1);
            try {
                const data = await LyricsEngine.fetchLyrics(currentTrack.artist, currentTrack.title, duration);
                setLyrics(data);
            } catch (e) {
                console.error('Lyrics fetch error', e);
            } finally {
                setIsLoadingLyrics(false);
            }
        };
        fetch();
    }, [currentTrack?.id, duration]);

    // Sync lyrics with playback
    useEffect(() => {
        if (lyrics.length === 0) return;
        let frameId: number;
        let running = true;

        const updateFrame = () => {
            if (!running) return;
            const time = usePlayerStore.getState().currentTime;
            let newIdx = -1;
            for (let i = 0; i < lyrics.length; i++) {
                if (time >= lyrics[i].time && (!lyrics[i + 1] || time < lyrics[i + 1].time)) {
                    newIdx = i; break;
                }
            }
            setActiveIdx(prev => prev !== newIdx ? newIdx : prev);
            if (newIdx !== -1 && scrollRef.current && linesRef.current[newIdx]) {
                const el = linesRef.current[newIdx];
                if (el) {
                    const target = el.offsetTop - scrollRef.current.offsetHeight / 2 + el.offsetHeight / 2;
                    const ds = target - scrollRef.current.scrollTop;
                    if (Math.abs(ds) > 1) scrollRef.current.scrollTop += ds * 0.08;
                }
            }
            frameId = requestAnimationFrame(updateFrame);
        };
        frameId = requestAnimationFrame(updateFrame);
        return () => {
            running = false;
            cancelAnimationFrame(frameId);
        };
    }, [lyrics]);

    if (!currentTrack) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[350] flex overflow-hidden"
            style={{
                background: `radial-gradient(ellipse at 30% 20%, rgba(${artworkColor},0.4) 0%, transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(${artworkColor},0.2) 0%, transparent 60%), rgb(6,6,10)`
            }}
        >
            {/* Blurred artwork as background glow */}
            {currentTrack.artwork && (
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <img
                        src={currentTrack.artwork}
                        className="absolute inset-0 w-full h-full object-cover opacity-10 blur-[120px] scale-150"
                        alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />
                </div>
            )}

            {/* === CLOSE BUTTON === */}
            <button
                onClick={() => setIsLyricsOpen(false)}
                className="absolute top-8 left-8 z-40 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
                <ChevronDown size={22} />
            </button>

            {/* === LEFT PANEL: LYRICS === */}
            <div className="flex-1 relative z-10 flex flex-col overflow-hidden pt-24 pb-10">
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto pb-[30vh] px-16 space-y-8"
                    style={{
                        maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 85%, transparent 100%)',
                        scrollbarWidth: 'none'
                    }}
                >
                    {isLoadingLyrics ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 pt-32">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                className="w-6 h-6 border-2 border-white/10 border-t-white/60 rounded-full"
                            />
                            <p className="text-white/20 text-[10px] font-black tracking-[0.3em] uppercase">Cargando letras</p>
                        </div>
                    ) : lyrics.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20 pt-32 gap-4">
                            <MessageSquare size={40} />
                            <p className="text-2xl font-black italic tracking-tighter">Sin letras disponibles</p>
                        </div>
                    ) : (
                        lyrics.map((line, i) => {
                            const isActive = i === activeIdx;
                            const isPast = i < activeIdx;
                            return (
                                <motion.p
                                    key={i}
                                    ref={el => linesRef.current[i] = el}
                                    animate={{
                                        opacity: isActive ? 1 : isPast ? 0.25 : 0.07,
                                        scale: isActive ? 1.02 : 0.97,
                                        filter: isActive ? 'blur(0px)' : 'blur(0.5px)',
                                    }}
                                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                                    onClick={() => setSeekTo(line.time)}
                                    className="text-3xl md:text-5xl font-black leading-tight tracking-tighter cursor-pointer select-none text-white hover:opacity-80 transition-opacity"
                                >
                                    {line.text}
                                </motion.p>
                            );
                        })
                    )}
                </div>
            </div>

            {/* === RIGHT PANEL: ARTWORK + CONTROLS === */}
            <div className="w-[380px] md:w-[420px] relative z-20 flex flex-col items-center justify-center pb-10 px-8 gap-8 flex-shrink-0">
                {/* Artwork - contained, no overflow */}
                <motion.div
                    className="relative w-full aspect-square rounded-3xl overflow-hidden"
                    animate={isPlaying ? { boxShadow: `0 30px 80px rgba(${artworkColor},0.4), 0 0 0 1px rgba(255,255,255,0.05)` } : { boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)' }}
                    transition={{ duration: 1 }}
                    style={{ maxWidth: 320, margin: '0 auto' }}
                >
                    {currentTrack.artwork ? (
                        <img src={currentTrack.artwork} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <MessageSquare size={40} className="text-white/20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </motion.div>

                {/* Track Info */}
                <div className="w-full text-center space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tight truncate">{currentTrack.title}</h2>
                    <p className="text-sm text-white/40 font-bold uppercase tracking-widest truncate">{currentTrack.artist}</p>
                </div>

                {/* Progress bar */}
                <div className="w-full space-y-2">
                    <div
                        className="relative h-1 w-full bg-white/10 rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const ratio = (e.clientX - rect.left) / rect.width;
                            setSeekTo(ratio * duration);
                        }}
                    >
                        <motion.div
                            className="absolute left-0 top-0 h-full bg-white rounded-full"
                            animate={{ width: `${progress}%` }}
                            transition={{ type: 'tween', duration: 0.1 }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-white/20 tracking-widest">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-between w-full px-4">
                    <button
                        onClick={() => toggleFavorite()}
                        className={`p-3 rounded-full transition-all ${currentTrack.favorite ? 'text-red-400' : 'text-white/20 hover:text-white'}`}
                    >
                        <Heart size={22} className={currentTrack.favorite ? 'fill-current' : ''} />
                    </button>

                    <button onClick={playPrevious} className="p-3 text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90">
                        <SkipBack size={26} fill="currentColor" />
                    </button>

                    <motion.button
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-[0_10px_40px_rgba(255,255,255,0.2)]"
                    >
                        {isPlaying ? <Pause size={28} fill="currentColor" strokeWidth={0} /> : <Play size={28} fill="currentColor" strokeWidth={0} className="ml-1" />}
                    </motion.button>

                    <button onClick={playNext} className="p-3 text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90">
                        <SkipForward size={26} fill="currentColor" />
                    </button>

                    <div className="w-10" /> {/* Spacer to balance heart */}
                </div>
            </div>
        </motion.div>
    );
};
