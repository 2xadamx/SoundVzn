import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Play, Music, FolderOpen, MoreVertical } from 'lucide-react';
import { usePlayerStore } from '../../store/player';
import { getAllTracks } from '../../utils/database';
import { Track } from '../../types';
import { shallow } from 'zustand/shallow';

export const DownloadsView: React.FC = () => {
    const [downloads, setDownloads] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { playUnifiedCollection, currentTrack } = usePlayerStore(
        (state) => ({
            playUnifiedCollection: state.playUnifiedCollection,
            currentTrack: state.currentTrack,
        }),
        shallow
    );

    const listRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(400);
    const ROW_HEIGHT = 64;
    const OVERSCAN = 6;

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        const update = () => setViewportHeight(el.clientHeight || 400);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const { visibleDownloads, offsetY, bottomPad } = useMemo(() => {
        const total = downloads.length * ROW_HEIGHT;
        if (downloads.length === 0) {
            return { visibleDownloads: [] as Array<{ track: Track; index: number }>, offsetY: 0, bottomPad: 0 };
        }
        const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
        const endIndex = Math.min(
            downloads.length - 1,
            Math.floor((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN
        );
        const visible = downloads.slice(startIndex, endIndex + 1).map((track, idx) => ({
            track,
            index: startIndex + idx,
        }));
        const used = visible.length * ROW_HEIGHT;
        const top = startIndex * ROW_HEIGHT;
        const bottom = Math.max(0, total - top - used);
        return { visibleDownloads: visible, offsetY: top, bottomPad: bottom };
    }, [downloads, scrollTop, viewportHeight]);

    const fetchDownloads = async () => {
        try {
            setIsLoading(true);
            const allTracks = await getAllTracks();
            const data = allTracks.filter(t =>
                (typeof t.filePath === 'string' && (
                    !t.filePath.startsWith('http') ||
                    t.filePath.includes('/api/local/file')
                )) ||
                t.format === 'MP3' || t.format === 'M4A'
            );
            setDownloads(data);
        } catch (error) {
            console.error('Error fetching downloads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDownloads();
    }, []);

    const handlePlayAll = () => {
        if (downloads.length > 0) {
            playUnifiedCollection(downloads, 0, { type: 'library', name: 'Descargas' });
        }
    };

    const handleOpenFolder = () => {
        if ((window as any).electron?.openDownloadFolder) {
            (window as any).electron.openDownloadFolder();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-t-2 border-green-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24 animate-in fade-in duration-500">
            <header className="flex items-end justify-between gap-6">
                <div className="flex items-end gap-6">
                    <div className="w-48 h-48 rounded-[32px] bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-2xl glow-gradient">
                        <Download size={80} className="text-white" />
                    </div>
                    <div className="mb-2">
                        <p className="text-xs font-bold text-text-tertiary mb-2">Biblioteca</p>
                        <h1 className="text-6xl font-black text-white italic tracking-tighter mb-4">Descargas</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-white/60 font-medium">{downloads.length} pistas guardadas</span>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handlePlayAll}
                                className="bg-white text-black px-8 py-3 rounded-full font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all"
                            >
                                <Play size={18} fill="currentColor" />
                                Reproducir todo
                            </motion.button>
                        </div>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleOpenFolder}
                    className="mb-2 p-4 rounded-2xl border border-white/10 flex flex-col items-center gap-2 text-text-tertiary hover:text-white transition-all"
                >
                    <FolderOpen size={24} />
                    <span className="text-[10px] font-bold text-white/40">Abrir Carpeta</span>
                </motion.button>
            </header>

            <div className="bg-white/[0.02] rounded-[32px] border border-white/5 overflow-hidden">
                <div
                    ref={listRef}
                    className="max-h-[60vh] overflow-auto"
                    onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                >
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary border-b border-white/5">
                                <th className="px-6 py-4 w-12 text-center">#</th>
                                <th className="px-6 py-4">Título</th>
                                <th className="px-6 py-4">Artista</th>
                                <th className="px-6 py-4">Formato</th>
                                <th className="px-6 py-4 text-right">Duración</th>
                                <th className="px-6 py-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {downloads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center opacity-30">
                                            <Music size={48} className="mb-4" />
                                            <p className="font-black uppercase tracking-widest text-sm">No hay música descargada</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    <tr style={{ height: offsetY }}>
                                        <td colSpan={6} />
                                    </tr>
                                    {visibleDownloads.map(({ track, index }) => (
                                        <tr
                                            key={track.id}
                                            onClick={() => playUnifiedCollection(downloads, index, { type: 'library', name: 'Descargas' })}
                                            className={`group hover:bg-white/5 transition-colors cursor-pointer border-b border-white/[0.02] last:border-0 ${currentTrack?.id === track.id ? 'bg-white/10' : ''}`}
                                        >
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs font-black italic text-text-tertiary group-hover:hidden">
                                                    {index + 1}
                                                </span>
                                                <Play size={14} className="hidden group-hover:inline-block text-primary-400" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                                                        <img src={track.artwork || ''} className="w-full h-full object-cover" alt={track.title} />
                                                    </div>
                                                    <span className={`font-bold ${currentTrack?.id === track.id ? 'text-primary-400' : 'text-white'}`}>
                                                        {track.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-text-secondary font-medium">{track.artist}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-white/5 text-text-tertiary border border-white/5">
                                                    {track.format || 'LOCAL'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-xs text-text-tertiary">
                                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button className="p-2 text-text-tertiary hover:text-white transition-colors">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ height: bottomPad }}>
                                        <td colSpan={6} />
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};