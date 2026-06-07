import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Music } from 'lucide-react';
import { usePlayerStore } from '../../store/player';
import { getAllTracks } from '../../utils/database';
import { Track } from '../../types';
import { shallow } from 'zustand/shallow';

export const RecentView: React.FC = () => {
    const [recentTracks, setRecentTracks] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { playUnifiedCollection, currentTrack, isPlaying } = usePlayerStore(
        (state) => ({
            playUnifiedCollection: state.playUnifiedCollection,
            currentTrack: state.currentTrack,
            isPlaying: state.isPlaying,
        }),
        shallow
    );

    // ── Virtual scroll ──────────────────────────────────────────────────────
    const listRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(400);
    const ROW_HEIGHT = 72;
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

    // ── Data loading ────────────────────────────────────────────────────────
    const fetchData = async () => {
        try {
            setIsLoading(true);
            const allData = await getAllTracks();
            
            const recent = [...allData]
                .filter(t => t.lastPlayed)
                .sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime())
                .slice(0, 100);
            
            setRecentTracks(recent);
        } catch (error) {
            console.error('Error fetching recent data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // ── Virtual scroll computation ──────────────────────────────────────────
    const { visibleItems, offsetY, bottomPad } = useMemo(() => {
        const total = recentTracks.length * ROW_HEIGHT;
        if (recentTracks.length === 0) {
            return { visibleItems: [] as Array<{ track: Track; index: number }>, offsetY: 0, bottomPad: 0 };
        }
        const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
        const endIndex = Math.min(
            recentTracks.length - 1,
            Math.floor((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN
        );
        const visible = recentTracks.slice(startIndex, endIndex + 1).map((track, idx) => ({
            track,
            index: startIndex + idx,
        }));
        const used = visible.length * ROW_HEIGHT;
        const top = startIndex * ROW_HEIGHT;
        const bottom = Math.max(0, total - top - used);
        return { visibleItems: visible, offsetY: top, bottomPad: bottom };
    }, [recentTracks, scrollTop, viewportHeight]);

    const handlePlayAll = () => {
        if (recentTracks.length === 0) return;
        playUnifiedCollection(recentTracks, 0, { type: 'library', name: 'Recientes' });
    };

    const headerArtworks = useMemo(() =>
        recentTracks.slice(0, 4).map(f => f.artwork).filter(Boolean) as string[],
        [recentTracks]
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-10 h-10 border-t-2 border-white/20 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 animate-in fade-in duration-500">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />

                {/* Collage */}
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden grid grid-cols-2 gap-0.5 bg-white/[0.05] shrink-0 border border-white/10 shadow-2xl">
                    {headerArtworks.length > 0 ? (
                        headerArtworks.map((art, i) => (
                            <img key={i} src={art} alt="" className="w-full h-full object-cover" />
                        ))
                    ) : (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white/[0.03]" />
                        ))
                    )}
                </div>

                <div className="flex-1 text-center md:text-left z-10">
                    <p className="text-[10px] font-bold tracking-[0.16em] text-white/20 uppercase mb-1">Tu biblioteca</p>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter mb-4">Recientes</h1>
                    <div className="flex items-center justify-center md:justify-start gap-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePlayAll}
                            disabled={recentTracks.length === 0}
                            className="bg-white text-black px-6 py-2 rounded-full font-black text-[11px] tracking-tight flex items-center gap-2 shadow-xl disabled:opacity-40"
                        >
                            <Play size={12} fill="currentColor" />
                            REPRODUCIR TODO
                        </motion.button>
                        <span className="text-white/25 text-[11px] font-bold">
                            {recentTracks.length} {recentTracks.length === 1 ? 'pista' : 'pistas'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── List (virtual scroll) ── */}
            <div
                ref={listRef}
                className="max-h-[60vh] overflow-y-auto overflow-x-hidden custom-scrollbar"
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            >
                <div style={{ height: offsetY }} />

                {recentTracks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                        <Clock size={48} strokeWidth={1} className="mb-4" />
                        <p className="text-sm font-bold text-white">
                            No hay historial de reproducción
                        </p>
                    </div>
                ) : (
                    visibleItems.map(({ track, index }) => (
                        <motion.div
                            key={`${track.id}-${index}`}
                            style={{ height: ROW_HEIGHT }}
                            className={`group flex items-center gap-4 py-3 px-4 rounded-xl transition-all cursor-pointer border border-transparent ${
                                currentTrack?.id === track.id
                                    ? 'bg-white/[0.05] border-white/10'
                                    : 'hover:bg-white/[0.03]'
                            }`}
                            onClick={() => playUnifiedCollection(recentTracks, index, {
                                type: 'library',
                                name: 'Recientes'
                            })}
                        >
                            <span className="w-5 text-center text-[10px] font-bold text-white/20 group-hover:text-white/40 shrink-0">
                                {index + 1}
                            </span>

                            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-lg bg-white/5">
                                {track.artwork ? (
                                    <img src={typeof track.artwork === 'string' ? track.artwork : ((track.artwork as any)?.medium || '')} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/10">
                                        <Music size={14} />
                                    </div>
                                )}
                                {currentTrack?.id === track.id && isPlaying && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                                        <div className="flex gap-0.5 items-end h-3">
                                            {[1, 2, 3].map(i => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: [4, 12, 6, 12, 4] }}
                                                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                                                    className="w-[2px] bg-white rounded-full"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className={`text-[13px] font-bold truncate ${
                                        currentTrack?.id === track.id ? 'text-primary' : 'text-white'
                                    }`}>
                                        {track.title}
                                    </h4>
                                    {track.offline && (
                                        <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded tracking-tighter shrink-0">
                                            Offline
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-white/30 font-bold truncate mt-0.5">{track.artist}</p>
                            </div>

                            <div className="text-[11px] text-white/20 font-bold tracking-tight shrink-0">
                                {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                            </div>
                        </motion.div>
                    ))
                )}

                <div style={{ height: bottomPad }} />
            </div>
        </div>
    );
};
