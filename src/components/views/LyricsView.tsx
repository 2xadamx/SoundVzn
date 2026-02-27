import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, MoreHorizontal, MessageSquare, Volume2, SkipBack, SkipForward, Play, Pause, Heart } from 'lucide-react';
import { usePlayerStore } from '../../store/player';
import clsx from 'clsx';
import { shallow } from 'zustand/shallow';

export const LyricsView: React.FC = () => {
    const {
        currentTrack,
        isPlaying,
        setIsPlaying,
        playNext,
        playPrevious,
        currentTime,
        duration,
        setSeekTo,
        setIsLyricsOpen,
        volume
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
            volume: state.volume,
        }),
        shallow
    );

    const scrollRef = useRef<HTMLDivElement>(null);
    const [lyrics, setLyrics] = useState<{ time: number; text: string }[]>([]);
    const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

    // Fetch real lyrics from LRCLIB
    useEffect(() => {
        const fetchLyrics = async () => {
            if (!currentTrack) return;
            setIsLoadingLyrics(true);
            try {
                const query = encodeURIComponent(`${currentTrack.artist} ${currentTrack.title}`);
                const response = await fetch(`https://lrclib.net/api/search?q=${query}`);
                const data = await response.json();

                if (data && data.length > 0) {
                    const lyricsData = data.find((item: any) => item.syncedLyrics) || data[0];

                    if (lyricsData.syncedLyrics) {
                        const lines = lyricsData.syncedLyrics.split('\n');
                        const parsedLyrics = lines.map((line: string) => {
                            const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
                            if (match) {
                                const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
                                return { time, text: match[3].trim() };
                            }
                            return null;
                        }).filter((l: any) => l !== null);
                        setLyrics(parsedLyrics as { time: number; text: string }[]);
                    } else if (lyricsData.plainLyrics) {
                        const lines = lyricsData.plainLyrics.split('\n').filter((l: string) => l.trim());
                        const parsedLyrics = lines.map((text: string, i: number) => ({
                            time: (duration / lines.length) * i,
                            text: text.trim()
                        }));
                        setLyrics(parsedLyrics);
                    }
                } else {
                    setLyrics([{ time: 0, text: "No hemos encontrado la letra para esta canción." }]);
                }
            } catch (error) {
                console.error('Error fetching lyrics:', error);
                setLyrics([{ time: 0, text: "Error al cargar la letra." }]);
            } finally {
                setIsLoadingLyrics(false);
            }
        };
        fetchLyrics();
    }, [currentTrack?.id]);

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const activeLineIndex = lyrics.findIndex((line: { time: number; text: string }, i: number) => {
        const nextLine = lyrics[i + 1];
        return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    });

    useEffect(() => {
        if (scrollRef.current && activeLineIndex !== -1) {
            const activeElement = scrollRef.current.children[activeLineIndex] as HTMLElement;
            if (activeElement) {
                const containerHeight = scrollRef.current.offsetHeight;
                const elementOffset = activeElement.offsetTop;
                const elementHeight = activeElement.offsetHeight;

                scrollRef.current.scrollTo({
                    top: elementOffset - containerHeight / 2 + elementHeight / 2,
                    behavior: 'smooth'
                });
            }
        }
    }, [activeLineIndex]);

    if (!currentTrack) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col md:flex-row overflow-hidden shadow-2xl"
        >
            {/* Immersive Background */}
            <div className="absolute inset-0 z-0 bg-black">
                {/* Vibrant Album Art Blur */}
                <div
                    className="absolute inset-0 bg-cover bg-center scale-110 blur-[140px] opacity-70 transition-all duration-1000"
                    style={{ backgroundImage: `url(${currentTrack.artwork})` }}
                />
                {/* Dynamic Room Tint */}
                <div
                    className="absolute inset-0 opacity-50 mix-blend-overlay"
                    style={{ background: `radial-gradient(circle at center, rgb(var(--color-primary-rgb)), transparent)` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90" />
            </div>

            {/* Back Button - Moved to Left */}
            <button
                onClick={() => setIsLyricsOpen(false)}
                className="absolute top-10 left-10 z-[210] p-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all hover:scale-110 active:scale-95 group shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md"
            >
                <ChevronDown size={28} className="group-hover:-translate-y-1 transition-transform" />
            </button>

            {/* Left Side: Lyrics Display */}
            <div className="flex-1 relative z-10 flex flex-col pt-32 pl-16 pr-8 md:pl-32 md:pr-12 overflow-hidden">
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto space-y-12 scrollbar-hide mask-gradient-v pb-[60vh]"
                >
                    {isLoadingLyrics ? (
                        <div className="flex items-center gap-4 text-white/20 animate-pulse">
                            <MessageSquare className="animate-bounce" />
                            <p className="text-3xl font-bold italic">Sincronizando letras...</p>
                        </div>
                    ) : (
                        lyrics.map((line: { time: number; text: string }, i: number) => (
                            <motion.p
                                key={i}
                                animate={{
                                    opacity: activeLineIndex === i ? 1 : 0.15,
                                    scale: activeLineIndex === i ? 1.05 : 1,
                                    x: activeLineIndex === i ? 10 : 0,
                                    filter: activeLineIndex === i ? 'blur(0px)' : 'blur(1px)'
                                }}
                                className={clsx(
                                    "text-3xl md:text-5xl font-bold transition-all cursor-pointer hover:opacity-100 leading-tight tracking-tight max-w-[90%]",
                                    activeLineIndex === i ? "text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]" : "text-white/30"
                                )}
                                onClick={() => setSeekTo(line.time)}
                            >
                                {line.text}
                            </motion.p>
                        ))
                    )}
                </div>
            </div>

            {/* Right Side: Professional Player Card */}
            <div className="w-full md:w-[500px] relative z-20 bg-dark-950/20 backdrop-blur-[120px] border-l border-white/5 p-12 flex flex-col justify-center items-center shadow-[-50px_0_100px_rgba(0,0,0,0.8)]">
                {/* Single Artwork Display */}
                <motion.div
                    layoutId="artwork"
                    className="w-72 h-72 md:w-96 md:h-96 rounded-[50px] shadow-[0_45px_100px_rgba(0,0,0,0.8)] mb-12 overflow-hidden border border-white/20 group relative bg-black"
                >
                    <img
                        src={currentTrack.artwork}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                        alt={currentTrack.title}
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/5 opacity-50 pointer-events-none" />
                </motion.div>

                {/* Centered Track Info */}
                <div className="w-full text-center space-y-4 mb-12">
                    <motion.h2
                        className="text-4xl md:text-5xl font-black text-white px-4 tracking-tighter line-clamp-2"
                    >
                        {currentTrack.title}
                    </motion.h2>
                    <motion.p
                        className="text-xl md:text-2xl text-white font-bold tracking-[0.3em] opacity-40 italic uppercase"
                    >
                        {currentTrack.artist}
                    </motion.p>
                </div>

                {/* Progress Bar with Depth */}
                <div className="w-full space-y-4 mb-12 px-2">
                    <div className="h-2 w-full bg-white/5 rounded-full relative overflow-hidden shadow-inner">
                        <motion.div
                            className="absolute top-0 left-0 h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                            animate={{ width: `${(currentTime / duration) * 100}%` }}
                            transition={{ ease: "linear", duration: 0.1 }}
                        />
                    </div>
                    <div className="flex justify-between text-xs font-mono font-bold text-white/30 tracking-widest">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* High Fidelity Controls */}
                <div className="flex items-center gap-10 mb-14">
                    <button
                        onClick={playPrevious}
                        className="text-white/60 hover:text-white transition-all hover:scale-125 active:scale-90 p-2"
                    >
                        <SkipBack size={38} fill="currentColor" />
                    </button>

                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_20px_60px_rgba(255,255,255,0.3)] border-4 border-white/10 group overflow-hidden"
                    >
                        {isPlaying ? (
                            <Pause size={40} fill="currentColor" strokeWidth={0} />
                        ) : (
                            <Play size={40} fill="currentColor" strokeWidth={0} className="ml-1" />
                        )}
                    </button>

                    <button
                        onClick={playNext}
                        className="text-white/60 hover:text-white transition-all hover:scale-125 active:scale-90 p-2"
                    >
                        <SkipForward size={38} fill="currentColor" />
                    </button>
                </div>

                {/* Extra Actions */}
                <div className="flex items-center gap-8 w-full px-4">
                    <button className="p-4 rounded-2xl bg-white/5 border border-white/5 text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all shadow-xl">
                        <Heart size={24} />
                    </button>

                    <div className="flex-1 flex items-center gap-4 px-6 py-4 rounded-3xl bg-white/5 border border-white/5">
                        <Volume2 size={20} className="text-white/20" />
                        <div className="h-1.5 flex-1 bg-black/40 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-white/40"
                                animate={{ width: `${volume * 100}%` }}
                            />
                        </div>
                    </div>

                    <button className="p-4 rounded-2xl bg-white/5 border border-white/5 text-white/20 hover:text-white transition-all shadow-xl">
                        <MoreHorizontal size={24} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
