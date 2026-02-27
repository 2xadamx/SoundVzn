import React, { useRef, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PlayerBar } from '../player/PlayerBar';
import { usePlayerStore } from '../../store/player';
import { shallow } from 'zustand/shallow';
import { LyricsView } from '../views/LyricsView';
import { AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface MainLayoutProps {
    children?: React.ReactNode;
    currentView: string;
    onNavigate: (view: string, params?: any) => void;
}

// Singleton refs para AudioContext — persisten fuera del componente
// para evitar "InvalidStateError: Failed to create MediaElementSource"
const sharedAudioCtxRef: { current: AudioContext | null } = { current: null };
const sharedSourceRef: { current: MediaElementAudioSourceNode | null } = { current: null };
const sharedAnalyserRef: { current: AnalyserNode | null } = { current: null };

export const MainLayout: React.FC<MainLayoutProps> = ({ children, currentView, onNavigate }) => {
    const {
        currentTrack,
        isPlaying,
        volume,
        muted,
        seekTo,
        setSeekTo,
        repeat,
        setIsPlaying,
        setCurrentTime,
        setDuration,
        playNext,
        checkScrobble,
        isLyricsOpen,
        setAnalyser
    } = usePlayerStore(
        (state) => ({
            currentTrack: state.currentTrack,
            isPlaying: state.isPlaying,
            volume: state.volume,
            muted: state.muted,
            seekTo: state.seekTo,
            setSeekTo: state.setSeekTo,
            repeat: state.repeat,
            setIsPlaying: state.setIsPlaying,
            setCurrentTime: state.setCurrentTime,
            setDuration: state.setDuration,
            playNext: state.playNext,
            checkScrobble: state.checkScrobble,
            isLyricsOpen: state.isLyricsOpen,
            setAnalyser: state.setAnalyser,
        }),
        shallow
    );

    const audioRef = useRef<HTMLAudioElement>(null);

    // ─── Inicialización única del elemento de audio ─────────────────────────────
    useEffect(() => {
        if (!audioRef.current) return;
        const audioEl = audioRef.current;

        const setupAudioPipeline = () => {
            try {
                if (!sharedAudioCtxRef.current || sharedAudioCtxRef.current.state === 'closed') {
                    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
                    sharedAudioCtxRef.current = new AudioContextClass();
                }
                const ctx = sharedAudioCtxRef.current;

                if (!sharedAnalyserRef.current) {
                    sharedAnalyserRef.current = ctx.createAnalyser();
                    sharedAnalyserRef.current.fftSize = 512; // Mejor resolución para el visualizador
                }
                const analyser = sharedAnalyserRef.current;

                if (!sharedSourceRef.current) {
                    sharedSourceRef.current = ctx.createMediaElementSource(audioEl);
                    sharedSourceRef.current.connect(analyser);
                    analyser.connect(ctx.destination);
                }

                setAnalyser(analyser);
                if (ctx.state === 'suspended') ctx.resume().catch(() => { });
            } catch (e) {
                console.warn('Audio Pipeline Error:', e);
            }
        };

        // Eventos centralizados para evitar duplicidad y memory leaks
        const onPlay = () => {
            if (sharedAudioCtxRef.current?.state === 'suspended') {
                sharedAudioCtxRef.current.resume().catch(() => { });
            }
            setupAudioPipeline();
        };

        const onTimeUpdate = () => {
            const time = audioEl.currentTime;
            if (Number.isFinite(time)) {
                setCurrentTime(time);
                checkScrobble();
            }
        };

        const onLoadedMetadata = () => {
            const dur = audioEl.duration;
            setDuration(Number.isFinite(dur) ? dur : 0);
            audioEl.volume = muted ? 0 : volume;
        };

        const onCanPlay = () => {
            if (isPlaying) audioEl.play().catch(() => { });
        };

        const onEnded = () => {
            if (repeat === 'one') {
                audioEl.currentTime = 0;
                audioEl.play();
            } else {
                playNext();
            }
        };

        const onError = (e: any) => {
            console.error('Audio Element Error:', e);
            setIsPlaying(false);
        };

        audioEl.addEventListener('play', onPlay);
        audioEl.addEventListener('timeupdate', onTimeUpdate);
        audioEl.addEventListener('loadedmetadata', onLoadedMetadata);
        audioEl.addEventListener('canplay', onCanPlay);
        audioEl.addEventListener('ended', onEnded);
        audioEl.addEventListener('error', onError);

        // Pre-warm el context al primer click/interacción
        const warmUp = () => {
            onPlay();
            window.removeEventListener('click', warmUp);
        };
        window.addEventListener('click', warmUp);

        return () => {
            audioEl.removeEventListener('play', onPlay);
            audioEl.removeEventListener('timeupdate', onTimeUpdate);
            audioEl.removeEventListener('loadedmetadata', onLoadedMetadata);
            audioEl.removeEventListener('canplay', onCanPlay);
            audioEl.removeEventListener('ended', onEnded);
            audioEl.removeEventListener('error', onError);
            window.removeEventListener('click', warmUp);
        };
    }, []); // Una sola vez al montar la app

    // ─── Sincronizar estado del Store con el HTMLAudioElement ─────────────────
    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        // Volumen
        audioEl.volume = muted ? 0 : volume;

        // Play/Pause y Source
        const currentSrc = audioEl.getAttribute('src');
        const nextSrc = currentTrack?.filePath || '';

        if (nextSrc !== currentSrc) {
            console.log(`🎵 Switching track to: ${currentTrack?.title || 'Unknown'}`);
            audioEl.pause();
            if (nextSrc) {
                audioEl.src = nextSrc;
                audioEl.load();
                if (isPlaying) audioEl.play().catch(() => { });
            } else {
                audioEl.removeAttribute('src');
                audioEl.load();
            }
        } else if (isPlaying && audioEl.paused && nextSrc) {
            audioEl.play().catch(() => { });
        } else if (!isPlaying && !audioEl.paused) {
            audioEl.pause();
        }
    }, [isPlaying, currentTrack?.id, currentTrack?.filePath, volume, muted]);

    // ─── Seek ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (seekTo == null || !Number.isFinite(seekTo)) return;
        const audioEl = audioRef.current;
        if (!audioEl) return;

        try {
            audioEl.currentTime = seekTo;
            setCurrentTime(seekTo);
        } catch (err) {
            console.warn('Seek error:', err);
        } finally {
            setSeekTo(null);
        }
    }, [seekTo, setCurrentTime, setSeekTo]);

    return (
        <div className="flex h-screen bg-transparent text-text-primary overflow-hidden font-sans selection:bg-primary/30 selection:text-white relative z-10 text-white">
            {/* Reproductor de Audio — Singleton persistent element */}
            <audio
                ref={audioRef}
                crossOrigin="anonymous"
                preload="auto"
                playsInline
                style={{ position: 'fixed', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
                aria-hidden
            />

            <AnimatePresence>
                {isLyricsOpen && <LyricsView />}
            </AnimatePresence>

            {!isLyricsOpen && currentView !== 'glass-center' && <Sidebar currentView={currentView} onNavigate={onNavigate} />}

            <main className={clsx(
                "flex-1 relative flex flex-col min-w-0 transition-opacity duration-300",
                isLyricsOpen ? "opacity-0 pointer-events-none invisible" : "opacity-100"
            )}>
                {currentView !== 'glass-center' && <Header onNavigate={onNavigate} />}

                <div className={clsx(
                    "flex-1 overflow-y-auto p-8 pt-4 scroll-smooth",
                    "pb-32"
                )}>
                    {children}
                </div>
            </main>

            {!isLyricsOpen && currentView !== 'glass-center' && <PlayerBar onNavigate={onNavigate} />}

            {/* Background Decor */}
            <div className="fixed top-[-20%] left-[20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-accent-blue/5 rounded-full blur-[100px] pointer-events-none" />
        </div>
    );
};
