import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/player';
import { addTrack } from '../../utils/database';
import { Visualizer } from './Visualizer';
import { Mic2, ListMusic, Heart, Download, Loader2, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX } from 'lucide-react';
import { notificationService } from '@services/notificationService';
import { shallow } from 'zustand/shallow';

const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TechBadge: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
    <span className={clsx(
        "text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 tracking-widest transition-all duration-500",
        active && "text-primary-400 border-primary-500/30 bg-primary-500/10"
    )}>
        {label}
    </span>
);

export const PlayerBar: React.FC<{ onNavigate?: (view: string, params?: any) => void }> = ({ onNavigate }) => {
    const {
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        muted,
        setIsPlaying,
        playNext,
        playPrevious,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        shuffle,
        repeat,
        setSeekTo,
        setIsLyricsOpen,
        isLyricsOpen,
        toggleFavorite,
        isResolving
    } = usePlayerStore(
        (state) => ({
            currentTrack: state.currentTrack,
            isPlaying: state.isPlaying,
            currentTime: state.currentTime,
            duration: state.duration,
            volume: state.volume,
            muted: state.muted,
            setIsPlaying: state.setIsPlaying,
            playNext: state.playNext,
            playPrevious: state.playPrevious,
            setVolume: state.setVolume,
            toggleMute: state.toggleMute,
            toggleShuffle: state.toggleShuffle,
            toggleRepeat: state.toggleRepeat,
            shuffle: state.shuffle,
            repeat: state.repeat,
            setSeekTo: state.setSeekTo,
            setIsLyricsOpen: state.setIsLyricsOpen,
            isLyricsOpen: state.isLyricsOpen,
            toggleFavorite: state.toggleFavorite,
            isResolving: state.isResolving,
        }),
        shallow
    );

    const [downloadState, setDownloadState] = React.useState<'idle' | 'downloading' | 'done'>('idle');
    const [isHoveringProgress, setIsHoveringProgress] = React.useState(false);
    const [isHoveringVolume, setIsHoveringVolume] = React.useState(false);

    React.useEffect(() => {
        const checkDownloaded = async () => {
            if (!currentTrack?.id) {
                setDownloadState('idle');
                return;
            }
            if (currentTrack.format === 'LOCAL' || currentTrack.filePath?.includes('downloads')) {
                setDownloadState('done');
                return;
            }
            // Fallback: check database
            const { getAllTracks } = await import('../../utils/database');
            const allTracks = await getAllTracks();
            const isLocal = allTracks.find(t => t.id === currentTrack.id && t.format === 'LOCAL');
            setDownloadState(isLocal ? 'done' : 'idle');
        };
        checkDownloaded();
    }, [currentTrack?.id]);

    const handleDownload = async () => {
        if (!currentTrack || downloadState !== 'idle') return;
        if (!window.electron?.downloadTrack) return;

        const trackLabel = currentTrack.title || currentTrack.artist || 'track';
        notificationService.downloadStarted(trackLabel);

        // Unlimited downloads for all users

        setDownloadState('downloading');
        try {
            window.electron.onDownloadProgress?.((_data: any) => {
                // Progress tracking disabled for now to simplify
            });
            const result = await (window.electron as any).downloadTrack(
                currentTrack.id,
                currentTrack.title,
                currentTrack.artist
            );
            if (result?.success) {
                // Persist to database so it shows in DownloadsView
                await addTrack({
                    ...currentTrack,
                    filePath: result.filePath,
                    format: 'LOCAL',
                    dateAdded: Date.now()
                });
                setDownloadState('done');
                notificationService.downloadCompleted(trackLabel);
            }
            else setDownloadState('idle');
        } catch (err: any) {
            console.error('Download error:', err);
            alert(`Error al descargar: ${err.message || 'Error desconocido'}`);
            setDownloadState('idle');
            notificationService.downloadFailed(trackLabel);
        }
    };

    const [localProgress, setLocalProgress] = React.useState<number | null>(null);
    const [isSeeking, setIsSeeking] = React.useState(false);

    const progress = isSeeking && localProgress !== null
        ? localProgress
        : (duration > 0 ? (currentTime / duration) * 100 : 0);

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalProgress(parseFloat(e.target.value));
    };

    const commitSeek = (val: number) => {
        const newTime = (val / 100) * duration;
        setSeekTo(newTime);
        setIsSeeking(false);
        setLocalProgress(null);
    };

    if (!currentTrack) return null;

    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="h-24 bg-dark-950/80 backdrop-blur-[50px] border-t border-white/5 fixed bottom-0 left-0 right-0 z-50 flex items-center px-10 gap-12 no-drag overflow-hidden"
        >
            {/* Resolution Progress Bar */}
            {isResolving && (
                <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-primary-500 to-transparent z-50 pointer-events-none"
                />
            )}
            {/* Left: Track Info */}
            <div className="flex items-center gap-5 w-1/4 min-w-[280px] z-10">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    animate={isResolving ? {
                        scale: [1, 1.05, 1],
                        opacity: [1, 0.8, 1]
                    } : {}}
                    transition={isResolving ? { repeat: Infinity, duration: 1.5 } : {}}
                    onClick={() => onNavigate?.('glass-center')}
                    className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden relative group cursor-pointer shadow-lg"
                >
                    {/* Audio Priority Optimization */}
                    {currentTrack.artwork && !isResolving ? (
                        <img
                            src={currentTrack.artwork}
                            alt={currentTrack.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <Mic2 size={20} className={clsx("text-white/20", isResolving && "animate-pulse text-primary-400")} />
                        </div>
                    )}
                </motion.div>

                <div className="flex flex-col min-w-0 flex-1">
                    <h4 className="font-bold text-white text-[15px] truncate leading-tight tracking-tight">
                        {currentTrack.title}
                    </h4>
                    <p className="text-xs font-medium text-text-tertiary truncate mt-0.5">
                        {currentTrack.artist}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 opacity-60">
                        {isResolving ? (
                            <TechBadge label="Resolviendo..." active />
                        ) : (
                            <>
                                <TechBadge label="Hi-Res" active />
                                <Visualizer className="h-2.5 w-12" />
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-0.5">
                    <button
                        onClick={() => toggleFavorite()}
                        className={clsx("p-2 transition-colors", currentTrack.favorite ? "text-primary-500" : "text-white/20 hover:text-white")}
                    >
                        <Heart size={18} className={currentTrack.favorite ? "fill-current" : ""} />
                    </button>
                    <button
                        onClick={handleDownload}
                        className={clsx("p-2 transition-colors", downloadState === 'done' ? "text-primary-400" : "text-white/20 hover:text-white")}
                    >
                        {downloadState === 'downloading' ? <Loader2 size={16} className="animate-spin text-primary-400" /> : <Download size={16} />}
                    </button>
                </div>
            </div>

            {/* Center: Controls & Progress */}
            <div className="flex-1 flex flex-col items-center gap-4 z-10" >
                <div className="flex items-center gap-8">
                    <button
                        onClick={toggleShuffle}
                        className={clsx("p-2 transition-all", shuffle ? "text-primary-500" : "text-white/20 hover:text-white")}
                    >
                        <Shuffle size={16} />
                    </button>

                    <button onClick={playPrevious} className="text-white/40 hover:text-white transition-colors">
                        <SkipBack size={24} fill="currentColor" />
                    </button>

                    <button
                        className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <button onClick={playNext} className="text-white/40 hover:text-white transition-colors">
                        <SkipForward size={24} fill="currentColor" />
                    </button>

                    <button
                        onClick={toggleRepeat}
                        className={clsx("p-2 transition-all relative", repeat !== 'off' ? "text-primary-500" : "text-white/20 hover:text-white")}
                    >
                        <Repeat size={16} />
                        {repeat === 'one' && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold bg-primary-500 text-dark-950 w-3 h-3 rounded-full flex items-center justify-center">1</span>}
                    </button>
                </div>

                <div className="w-full flex items-center gap-3 group" onMouseEnter={() => setIsHoveringProgress(true)} onMouseLeave={() => setIsHoveringProgress(false)}>
                    <span className="text-[10px] font-medium font-mono text-white/30 w-8 text-right">
                        {formatTime(currentTime)}
                    </span>

                    <div className="flex-1 relative h-4 flex items-center">
                        <input
                            type="range"
                            min="0" max="100" step="0.1"
                            value={progress || 0}
                            onMouseDown={() => setIsSeeking(true)}
                            onChange={handleSeekChange}
                            onMouseUp={(e) => commitSeek(parseFloat(e.currentTarget.value))}
                            className="absolute z-20 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
                            <motion.div
                                className="h-full bg-white/60 relative"
                                animate={{ width: `${progress}%` }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        </div>
                        <motion.div
                            className="absolute h-3 w-3 bg-white rounded-full shadow-lg pointer-events-none"
                            animate={{
                                left: `${progress}%`,
                                scale: isHoveringProgress ? 1 : 0,
                                opacity: isHoveringProgress ? 1 : 0
                            }}
                            style={{ marginLeft: '-6px' }}
                        />
                    </div>

                    <span className="text-[10px] font-medium font-mono text-white/30 w-8">
                        {formatTime(duration)}
                    </span>
                </div>
            </div >

            {/* Right: Volume & Extras */}
            < div className="w-1/4 min-w-[280px] flex items-center justify-end gap-5 z-10" >
                <div
                    className="flex items-center gap-3 bg-white/[0.03] px-4 py-2 rounded-xl border border-white/5 group"
                    onMouseEnter={() => setIsHoveringVolume(true)}
                    onMouseLeave={() => setIsHoveringVolume(false)}
                >
                    <button onClick={toggleMute} className="text-white/40 hover:text-white transition-colors">
                        {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <div className="w-20 relative h-4 flex items-center">
                        <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={muted ? 0 : volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="absolute z-20 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
                            <motion.div
                                className="h-full bg-primary-500/60"
                                animate={{ width: `${(muted ? 0 : volume) * 100}%` }}
                            />
                        </div>
                        <motion.div
                            className="absolute h-2.5 w-2.5 bg-white rounded-full shadow-md pointer-events-none"
                            animate={{
                                left: `${(muted ? 0 : volume) * 100}%`,
                                scale: isHoveringVolume ? 1 : 0
                            }}
                            style={{ marginLeft: '-5px' }}
                        />
                    </div>
                </div>

                <button
                    onClick={() => setIsLyricsOpen(!isLyricsOpen)}
                    className={clsx(
                        "p-2.5 rounded-xl transition-all border border-white/5",
                        isLyricsOpen ? "bg-primary-500 text-dark-950 shadow-lg border-primary-400" : "text-white/30 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Mic2 size={18} />
                </button>

                <button className="p-2.5 rounded-xl text-white/30 hover:text-white border border-white/5 hover:bg-white/5 transition-all">
                    <ListMusic size={18} />
                </button>
            </div >
        </motion.div >
    );
};
