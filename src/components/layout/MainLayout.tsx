import React, { useRef, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PlayerBar } from '../player/PlayerBar';
import { QueuePanel } from '../player/QueuePanel';
import { usePlayerStore } from '../../store/player';
import { GlassCenter } from '../views/GlassCenter';
import { LyricsView } from '../views/LyricsView';
import { YouTubeHybridPlayer } from '../player/YouTubeHybridPlayer';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { initAudioProcessor } from '../../utils/audioProcessor';
import { Home, Search, Users, ListMusic, User } from 'lucide-react';

interface MainLayoutProps {
    children?: React.ReactNode;
    currentView: string;
    onNavigate: (view: string, params?: any) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, currentView, onNavigate }) => {
    const {
        currentTrack,
        isPlaying,
        volume,
        muted,
        seekTo,
        setSeekTo,
        setCurrentTime,
        setDuration,
        playNext,
        checkScrobble,
        isLyricsOpen,
        isQueueOpen,
        isGlassOpen,
        setIsGlassOpen,
        activeAudio,
        deckA,
        deckB,
        playbackSource,
        playUnifiedTrack,
        setPlaybackSource,
        setYoutubeId,
        addToast,
        setIsPlaying,
    } = usePlayerStore();

    const audioRefA = useRef<HTMLAudioElement>(null);
    const audioRefB = useRef<HTMLAudioElement>(null);

    const handleAudioError = (deckIndex: 0 | 1, event: any) => {
        if (deckIndex !== activeAudio) return;

        const el = deckIndex === 0 ? audioRefA.current : audioRefB.current;
        const ytId = currentTrack?.externalIds?.youtubeId || 
                     (currentTrack?.id?.length === 11 ? currentTrack.id : null);

        if (ytId && playbackSource === 'api') {
            if (el && el.src && !el.src.includes('retry=')) {
                console.warn(`[AudioEngine] Proxy stalled for ${currentTrack?.title}. Retrying...`);
                const retryUrl = el.src.includes('?') ? `${el.src}&retry=${Date.now()}` : `${el.src}?retry=${Date.now()}`;
                el.src = retryUrl;
                el.load();
                if (isPlaying) el.play().catch(() => {});
                return;
            }

            console.warn(`[AudioEngine] Fallo persistente para ${currentTrack?.title}. Conmutando a IFrame...`);
            
            addToast({
                type: 'info',
                message: 'Stream inestable. Cambiando al reproductor alternativo...',
                duration: 3500
            });

            setYoutubeId(ytId);
            setPlaybackSource('iframe');
            setIsPlaying(true);
        } else {
            // No ytId — backend not reachable or local file error
            console.error('[AudioEngine] Error de reproducción sin fallback disponible:', event);
            if (currentTrack) {
                addToast({
                    type: 'error',
                    message: `No se puede reproducir "${currentTrack.title}" — comprueba el servidor`,
                    duration: 4500
                });
            }
            setIsPlaying(false);
        }
    };


    // ─── Inicialización del Motor de Audio ─────────────────────────────────────────
    useEffect(() => {
        if (audioRefA.current && audioRefB.current) {
            initAudioProcessor(audioRefA.current, audioRefB.current).catch(console.error);
        }
    }, [audioRefA, audioRefB]);

    // ─── Escuchar evento 'play-track' de las sugerencias del header ────────────────
    useEffect(() => {
        const handlePlayTrack = (e: any) => {
            const track = e.detail;
            if (track) {
                console.log('[MainLayout] Evento play-track recibido:', track.title);
                playUnifiedTrack(track).catch(console.warn);
            }
        };
        window.addEventListener('play-track', handlePlayTrack);
        return () => window.removeEventListener('play-track', handlePlayTrack);
    }, [playUnifiedTrack]);

    useEffect(() => {
        if (currentView === 'dj-mixer') {
            if (audioRefA.current && deckA.track) {
                if (audioRefA.current.src !== deckA.track.filePath) audioRefA.current.src = deckA.track.filePath || '';
                if (deckA.isPlaying) audioRefA.current.play().catch(() => {});
                else audioRefA.current.pause();
            }
            if (audioRefB.current && deckB.track) {
                if (audioRefB.current.src !== deckB.track.filePath) audioRefB.current.src = deckB.track.filePath || '';
                if (deckB.isPlaying) audioRefB.current.play().catch(() => {});
                else audioRefB.current.pause();
            }
            return;
        }

        // Si la fuente es el IFrame (YouTube), silenciar y pausar motores locales
        if (playbackSource === 'iframe') {
            if (audioRefA.current && !audioRefA.current.paused) audioRefA.current.pause();
            if (audioRefB.current && !audioRefB.current.paused) audioRefB.current.pause();
            return;
        }

        const el = activeAudio === 0 ? audioRefA.current : audioRefB.current;
        const other = activeAudio === 0 ? audioRefB.current : audioRefA.current;

        if (!el) return;

        // Silenciar el deck inactivo
        if (other && !other.paused) {
            other.pause();
        }

        const targetSrc = currentTrack?.filePath || '';
        if (!targetSrc) {
            el.pause();
            return;
        }

        // Cargar nueva fuente si cambió
        const currentSrc = el.getAttribute('data-track-id');
        if (currentSrc !== currentTrack?.id) {
            el.pause();
            el.src = targetSrc;
            el.setAttribute('data-track-id', currentTrack?.id || '');
            el.load();
        }

        el.volume = muted ? 0 : volume;

        if (isPlaying) {
            const playPromise = el.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("[AudioEngine] Local playback blocked:", error);
                });
            }
        } else {
            el.pause();
        }
    }, [isPlaying, currentTrack?.id, currentTrack?.filePath, activeAudio, currentView, playbackSource]);

    // ─── Sincronizar volumen ─────────────────────────────────────────────────────
    useEffect(() => {
        if (audioRefA.current) audioRefA.current.volume = muted ? 0 : volume;
        if (audioRefB.current) audioRefB.current.volume = muted ? 0 : volume;
    }, [volume, muted]);

    // ─── Seek requests ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (seekTo == null) return;
        const el = activeAudio === 0 ? audioRefA.current : audioRefB.current;
        if (!el) return;

        el.currentTime = seekTo;
        setCurrentTime(seekTo);
        setSeekTo(null);
    }, [seekTo, setCurrentTime, setSeekTo, activeAudio]);

    return (
        <div className="flex flex-col h-screen bg-transparent text-white overflow-hidden font-base selection:bg-indigo-500/30 selection:text-white relative z-10 transition-colors duration-1000">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden opacity-40">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-white/[0.03] rounded-full blur-[140px] animate-soft-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[120px] animate-soft-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Dual Audio Engine */}
            <audio ref={audioRefA} preload="auto"
                onTimeUpdate={() => { if (activeAudio === 0 && audioRefA.current) { setCurrentTime(audioRefA.current.currentTime); checkScrobble?.(); } }}
                onLoadedMetadata={() => { if (activeAudio === 0 && audioRefA.current) setDuration(audioRefA.current.duration || 0); }}
                onEnded={() => activeAudio === 0 && playNext()}
                onError={(e) => handleAudioError(0, e)}
                onStalled={(e) => handleAudioError(0, e)}
                className="hidden"
            />
            <audio ref={audioRefB} preload="auto"
                onTimeUpdate={() => { if (activeAudio === 1 && audioRefB.current) { setCurrentTime(audioRefB.current.currentTime); checkScrobble?.(); } }}
                onLoadedMetadata={() => { if (activeAudio === 1 && audioRefB.current) setDuration(audioRefB.current.duration || 0); }}
                onEnded={() => activeAudio === 1 && playNext()}
                onError={(e) => handleAudioError(1, e)}
                onStalled={(e) => handleAudioError(1, e)}
                className="hidden"
            />

            <YouTubeHybridPlayer />

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar — hidden on mobile */}
                {!isLyricsOpen && (
                    <div className="hidden sm:block">
                        <Sidebar currentView={currentView} onNavigate={onNavigate} />
                    </div>
                )}

                <main className={clsx(
                    "flex-1 relative flex flex-col min-w-0 transition-opacity duration-300",
                    isLyricsOpen ? "opacity-0 pointer-events-none invisible" : "opacity-100",
                    "bg-white/[0.015] backdrop-blur-[4px]"
                )}>
                    {/* Header — desktop and mobile (Header handles its own responsive layout) */}
                    <Header onNavigate={onNavigate} currentView={currentView} />

                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 sm:pt-4 scroll-smooth pb-56 sm:pb-24 custom-scrollbar">
                        {children}
                    </div>
                </main>

                <AnimatePresence>
                    {isQueueOpen && !isLyricsOpen && (
                        <div className="fixed inset-y-0 right-0 w-full sm:w-[380px] z-[300] pointer-events-none flex justify-end">
                            <motion.div
                                initial={{ x: 400, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 400, opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="h-full w-full pointer-events-auto shadow-[-20px_0_50px_rgba(0,0,0,0.5)] border-l border-white/5"
                            >
                                <QueuePanel />
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {isGlassOpen && (
                    <GlassCenter onNavigate={(view) => { setIsGlassOpen(false); onNavigate(view); }} />
                )}
            </AnimatePresence>

            {/* LyricsView floats above GlassCenter (z-300) */}
            <AnimatePresence>
                {isLyricsOpen && <LyricsView />}
            </AnimatePresence>

            {/* ── Mobile Bottom Navigation Bar ── */}
            {!isLyricsOpen && !isGlassOpen && (
                <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-[99] bg-black/80 backdrop-blur-3xl border-t border-white/[0.06] px-2 py-1 flex items-center justify-around">
                    {([
                        { id: 'home',     icon: Home,      label: 'Inicio' },
                        { id: 'search',   icon: Search,    label: 'Buscar' },
                        { id: 'friends',  icon: Users,     label: 'Social' },
                        { id: 'playlists',icon: ListMusic, label: 'Listas' },
                        { id: 'profile',  icon: User,      label: 'Perfil' },
                    ] as const).map(item => {
                        const active = currentView === item.id;
                        return (
                            <button key={item.id} onClick={() => onNavigate(item.id)}
                                className={clsx(
                                    'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all',
                                    active ? 'text-white' : 'text-white/25 hover:text-white/60'
                                )}>
                                <item.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                                <span className={clsx('text-[9px] font-bold uppercase tracking-widest', active ? 'text-white' : 'text-white/20')}>
                                    {item.label}
                                </span>
                                {active && (
                                    <div className="w-1 h-1 rounded-full bg-white mt-0.5" />
                                )}
                            </button>
                        );
                    })}
                </nav>
            )}

            {!isLyricsOpen && !isGlassOpen && <div className="sm:hidden h-16" />}
            {!isLyricsOpen && !isGlassOpen && <PlayerBar onNavigate={onNavigate} />}
        </div>
    );
};
