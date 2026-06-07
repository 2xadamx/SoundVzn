import React from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/player';
import { getAllPlaylists, addTrackToPlaylist } from '../../utils/database';
import {
    Mic2, ListMusic, Heart,
    Play, Pause, SkipBack, SkipForward, Repeat,
    Shuffle, Volume2, VolumeX, Plus
} from 'lucide-react';
import { notificationService } from '@services/notificationService';
import { normalizeArtistName } from '../../utils/formatters';

const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const PlayerBar: React.FC<{ onNavigate?: (view: string, params?: any) => void }> = ({ onNavigate }) => {
    const currentTrack  = usePlayerStore(s => s.currentTrack);
    const isPlaying     = usePlayerStore(s => s.isPlaying);
    const currentTime   = usePlayerStore(s => s.currentTime);
    const duration      = usePlayerStore(s => s.duration);
    const volume        = usePlayerStore(s => s.volume);
    const muted         = usePlayerStore(s => s.muted);
    const shuffle       = usePlayerStore(s => s.shuffle);
    const repeat        = usePlayerStore(s => s.repeat);
    const isResolving   = usePlayerStore(s => s.isResolving);
    const isLyricsOpen  = usePlayerStore(s => s.isLyricsOpen);
    const isQueueOpen   = usePlayerStore(s => s.isQueueOpen);

    const setIsPlaying    = usePlayerStore(s => s.setIsPlaying);
    const playNext        = usePlayerStore(s => s.playNext);
    const playPrevious    = usePlayerStore(s => s.playPrevious);
    const setVolume       = usePlayerStore(s => s.setVolume);
    const toggleMute      = usePlayerStore(s => s.toggleMute);
    const toggleShuffle   = usePlayerStore(s => s.toggleShuffle);
    const toggleRepeat    = usePlayerStore(s => s.toggleRepeat);
    const setSeekTo       = usePlayerStore(s => s.setSeekTo);
    const setIsLyricsOpen = usePlayerStore(s => s.setIsLyricsOpen);
    const setIsQueueOpen  = usePlayerStore(s => s.setIsQueueOpen);
    const toggleFavorite  = usePlayerStore(s => s.toggleFavorite);
    const setIsGlassOpen  = usePlayerStore(s => s.setIsGlassOpen);

    const [isAddMenuOpen, setIsAddMenuOpen] = React.useState(false);
    const [myPlaylists, setMyPlaylists]     = React.useState<any[]>([]);
    const [localProgress, setLocalProgress] = React.useState<number | null>(null);
    const [isSeeking, setIsSeeking]         = React.useState(false);

    React.useEffect(() => {
        if (isAddMenuOpen) getAllPlaylists().then(setMyPlaylists);
    }, [isAddMenuOpen]);

    const progress = isSeeking && localProgress !== null
        ? localProgress
        : (duration > 0 ? (currentTime / duration) * 100 : 0);

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setLocalProgress(parseFloat(e.target.value));

    const commitSeek = (val: number) => {
        setSeekTo((val / 100) * duration);
        setIsSeeking(false);
        setLocalProgress(null);
    };

    const handleAddToPlaylist = async (playlistId: string) => {
        if (!currentTrack) return;
        try {
            await addTrackToPlaylist(playlistId, currentTrack.id);
            setIsAddMenuOpen(false);
            notificationService.success('Añadido');
        } catch {
            notificationService.error('Error al añadir');
        }
    };

    if (!currentTrack) return null;

    return (
        <div className="select-none">
            {/* ── MOBILE PLAYER (sm and below) ── */}
            <div className="sm:hidden bg-black/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-4px_30px_rgba(0,0,0,0.7)]">
                {/* Progress bar */}
                <div className="relative h-[4px] bg-white/10 group/prog cursor-pointer">
                    <div className="h-full bg-white/90 transition-all" style={{ width: `${progress}%` }} />
                    <input type="range" min="0" max="100" step="0.1"
                        value={progress || 0}
                        onTouchStart={() => setIsSeeking(true)}
                        onMouseDown={() => setIsSeeking(true)}
                        onChange={handleSeekChange}
                        onMouseUp={e => commitSeek(parseFloat(e.currentTarget.value))}
                        onTouchEnd={e => commitSeek(parseFloat(e.currentTarget.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                        style={{ height: '20px', top: '-8px' }}
                    />
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                    {/* Artwork */}
                    <button onClick={async () => {
                            setIsGlassOpen(true);
                            try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); } catch (e) { console.warn(e); }
                        }}
                        className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-white/5 border border-white/10 shadow-xl">
                        {currentTrack.artwork && !isResolving
                            ? <img src={currentTrack.artwork} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full flex items-center justify-center">
                                <Mic2 size={16} className={clsx('text-white/20', isResolving && 'animate-pulse')} />
                              </div>
                        }
                    </button>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate leading-tight">{currentTrack.title}</p>
                        <p className="text-xs text-white/40 truncate">{normalizeArtistName(currentTrack.artist)}</p>
                    </div>

                    {/* Mobile controls */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => toggleFavorite()}
                            className={clsx('p-2 transition-all active:scale-90', currentTrack.favorite ? 'text-rose-400' : 'text-white/25 hover:text-white/60')}>
                            <Heart size={20} className={currentTrack.favorite ? 'fill-current' : ''} />
                        </button>
                        <button onClick={playPrevious} className="p-2 text-white/60 active:scale-90 transition-all hover:text-white">
                            <SkipBack size={22} fill="currentColor" />
                        </button>
                        <button onClick={() => setIsPlaying(!isPlaying)}
                            className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-xl active:scale-95 transition-all hover:scale-105">
                            {isPlaying
                                ? <Pause size={20} fill="currentColor" />
                                : <Play size={20} fill="currentColor" className="ml-0.5" />
                            }
                        </button>
                        <button onClick={playNext} className="p-2 text-white/60 active:scale-90 transition-all hover:text-white">
                            <SkipForward size={22} fill="currentColor" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── DESKTOP PLAYER (sm and above) ── */}
            <div className="hidden sm:block h-[88px] bg-black/85 backdrop-blur-[100px] border-t border-white/[0.06] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] px-6">
                {/* Progress bar — visible strip at the very top */}
                <div className="absolute top-0 left-0 right-0 h-[3px] group/progress cursor-pointer">
                    <div className="w-full h-full bg-white/[0.06]">
                        <div className="h-full bg-white/70 group-hover/progress:bg-white transition-colors"
                            style={{ width: `${progress}%` }} />
                    </div>
                    {/* Thumb dot on hover */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity pointer-events-none"
                        style={{ left: `calc(${progress}% - 6px)` }}
                    />
                    <input type="range" min="0" max="100" step="0.1"
                        value={progress || 0}
                        onMouseDown={() => setIsSeeking(true)}
                        onChange={handleSeekChange}
                        onMouseUp={e => commitSeek(parseFloat(e.currentTarget.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                        style={{ height: '16px', top: '-6px' }}
                    />
                </div>

                <div className="flex items-center justify-between h-full max-w-[2000px] mx-auto gap-4 pt-2">

                    {/* LEFT: track info */}
                    <div className="flex items-center gap-3 w-[30%] min-w-0">
                        <button onClick={async () => {
                                setIsGlassOpen(true);
                                try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); } catch (e) { console.warn(e); }
                            }}
                            className="w-10 h-10 rounded-[10px] overflow-hidden shrink-0 cursor-pointer bg-white/5 border border-white/10 group shadow-lg">
                            {currentTrack.artwork && !isResolving
                                ? <img src={currentTrack.artwork} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                : <div className="w-full h-full flex items-center justify-center">
                                    <Mic2 size={14} className={clsx('text-white/20', isResolving && 'animate-pulse')} />
                                  </div>
                            }
                        </button>
                        <div className="flex flex-col min-w-0">
                            <h4 className="text-[12px] font-black text-white/90 truncate leading-tight tracking-tight">{currentTrack.title}</h4>
                            <p className="text-[10px] font-bold text-white/30 truncate mt-0.5 uppercase tracking-wider">{normalizeArtistName(currentTrack.artist)}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-1 shrink-0">
                            <button onClick={() => toggleFavorite()}
                                className={clsx('hover:scale-110 transition-transform p-1', currentTrack.favorite ? 'text-rose-400' : 'text-white/20 hover:text-white/40')}>
                                <Heart size={14} className={currentTrack.favorite ? 'fill-current' : ''} />
                            </button>
                            <div className="relative">
                                <button onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                                    className="text-white/20 hover:text-white transition-colors p-1">
                                    <Plus size={15} />
                                </button>
                                <AnimatePresence>
                                    {isAddMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsAddMenuOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                                className="absolute bottom-full left-0 mb-3 w-52 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[20px] shadow-2xl z-50 overflow-hidden py-2"
                                            >
                                                <p className="px-4 py-2 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Añadir a...</p>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    {myPlaylists.map(p => (
                                                        <button key={p.id} onClick={() => handleAddToPlaylist(p.id)}
                                                            className="w-full text-left px-4 py-2 text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors truncate">
                                                            {p.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* CENTER: controls + time */}
                    <div className="flex flex-col items-center gap-2 w-[40%]">
                        <div className="flex items-center gap-6">
                            <button onClick={toggleShuffle}
                                className={clsx('transition-all', shuffle ? 'text-white' : 'text-white/15 hover:text-white/30')}>
                                <Shuffle size={14} />
                            </button>
                            <button onClick={playPrevious} className="text-white/40 hover:text-white transition-all active:scale-90">
                                <SkipBack size={20} fill="currentColor" />
                            </button>
                            <button onClick={() => setIsPlaying(!isPlaying)}
                                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                {isPlaying
                                    ? <Pause size={20} fill="currentColor" />
                                    : <Play size={20} fill="currentColor" className="ml-0.5" />
                                }
                            </button>
                            <button onClick={playNext} className="text-white/40 hover:text-white transition-all active:scale-90">
                                <SkipForward size={20} fill="currentColor" />
                            </button>
                            <button onClick={toggleRepeat}
                                className={clsx('transition-all relative', repeat !== 'off' ? 'text-white' : 'text-white/15 hover:text-white/30')}>
                                <Repeat size={14} />
                                {repeat === 'one' && (
                                    <span className="absolute -top-1.5 -right-1.5 text-[7px] font-black bg-white text-black w-3 h-3 rounded-full flex items-center justify-center">1</span>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-white/30 tabular-nums">{formatTime(currentTime)}</span>
                            <span className="text-[9px] text-white/10">/</span>
                            <span className="text-[9px] font-bold text-white/20 tabular-nums">{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* RIGHT: volume + extras */}
                    <div className="flex items-center justify-end gap-4 w-[30%]">
                        <div className="flex items-center gap-2 group/volume w-28">
                            <button onClick={toggleMute} className="text-white/20 hover:text-white transition-colors shrink-0">
                                {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                            </button>
                            <div className="flex-1 relative h-[3px] flex items-center">
                                <input type="range" min="0" max="1" step="0.01"
                                    value={muted ? 0 : volume}
                                    onChange={e => setVolume(parseFloat(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                <div className="w-full bg-white/10 rounded-full h-full overflow-hidden">
                                    <motion.div className="h-full bg-white/40 group-hover/volume:bg-white transition-colors"
                                        animate={{ width: `${(muted ? 0 : volume) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setIsLyricsOpen(!isLyricsOpen)}
                                className={clsx('p-1.5 rounded-lg transition-all', isLyricsOpen ? 'text-white bg-white/10' : 'text-white/20 hover:text-white hover:bg-white/5')}>
                                <Mic2 size={15} />
                            </button>
                            <button onClick={() => setIsQueueOpen(!isQueueOpen)}
                                className={clsx('p-1.5 rounded-lg transition-all', isQueueOpen ? 'text-white bg-white/10' : 'text-white/20 hover:text-white hover:bg-white/5')}>
                                <ListMusic size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
