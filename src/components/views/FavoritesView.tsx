import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Play, Music } from 'lucide-react';
import { usePlayerStore } from '../../store/player';
import { getFavorites } from '../../utils/database';
import { Track } from '../../types';
import { shallow } from 'zustand/shallow';

export const FavoritesView: React.FC = () => {
    const [favorites, setFavorites] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { playUnifiedCollection, currentTrack, isPlaying } = usePlayerStore(
        (state) => ({
            playUnifiedCollection: state.playUnifiedCollection,
            currentTrack: state.currentTrack,
            isPlaying: state.isPlaying,
        }),
        shallow
    );

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

    const { visibleFavorites, offsetY, bottomPad } = useMemo(() => {
        const total = favorites.length * ROW_HEIGHT;
        if (favorites.length === 0) {
            return { visibleFavorites: [] as Array<{ track: Track; index: number }>, offsetY: 0, bottomPad: 0 };
        }
        const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
        const endIndex = Math.min(
            favorites.length - 1,
            Math.floor((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN
        );
        const visible = favorites.slice(startIndex, endIndex + 1).map((track, idx) => ({
            track,
            index: startIndex + idx,
        }));
        const used = visible.length * ROW_HEIGHT;
        const top = startIndex * ROW_HEIGHT;
        const bottom = Math.max(0, total - top - used);
        return { visibleFavorites: visible, offsetY: top, bottomPad: bottom };
    }, [favorites, scrollTop, viewportHeight]);

    const fetchFavorites = async () => {
        try {
            setIsLoading(true);
            const data = await getFavorites();
            setFavorites(data);
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFavorites();
    }, []);

    const handlePlayAll = () => {
        if (favorites.length > 0) {
            playUnifiedCollection(favorites, 0, { type: 'library', name: 'Favoritos' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-t-2 border-primary-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24 animate-in fade-in duration-500">
            <header className="flex items-end gap-6">
                <div className="w-48 h-48 rounded-[32px] bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-2xl glow-gradient">
                    <Heart size={80} className="text-white fill-white" />
                </div>
                <div className="mb-2">
                    <p className="text-xs font-bold tracking-wider text-text-tertiary mb-2 text-primary-400">Playlist</p>
                    <h1 className="text-6xl font-black text-white tracking-tighter mb-4">Tus Favoritos</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-white/60 font-medium">{favorites.length} canciones</span>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePlayAll}
                            className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:shadow-primary-500/25 transition-all"
                        >
                            <Play size={18} fill="currentColor" />
                            Reproducir todo
                        </motion.button>
                    </div>
                </div>
            </header>

            <div
                ref={listRef}
                className="max-h-[60vh] overflow-auto"
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            >
                <div style={{ height: offsetY }} />
                {favorites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                        <Music size={48} className="text-text-tertiary mb-4 opacity-20" />
                        <p className="text-text-secondary font-bold">Aún no tienes canciones favoritas</p>
                        <p className="text-text-tertiary text-xs">Dale al ❤️ en cualquier canción para verla aquí</p>
                    </div>
                ) : (
                    visibleFavorites.map(({ track, index }) => (
                        <motion.div
                            key={track.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`group flex items-center gap-4 p-3 rounded-2xl transition-all hover:bg-white/5 border border-transparent hover:border-white/5 cursor-pointer ${currentTrack?.id === track.id ? 'bg-white/10' : ''}`}
                            onClick={() => playUnifiedCollection(favorites, index, { type: 'library', name: 'Favoritos' })}
                        >
                            <span className="w-8 text-center text-text-tertiary font-black italic">{index + 1}</span>
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 group-hover:shadow-lg transition-all">
                                <img src={track.artwork || ''} className="w-full h-full object-cover" alt={track.title} />
                                {currentTrack?.id === track.id && isPlaying && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="flex gap-1 items-end h-4">
                                            {[1, 2, 3].map(i => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: [4, 16, 8, 16, 4] }}
                                                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                                                    className="w-1 bg-primary-400 rounded-full"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`font-bold truncate ${currentTrack?.id === track.id ? 'text-primary-400' : 'text-white'}`}>
                                    {track.title}
                                </h4>
                                <p className="text-xs text-text-tertiary truncate uppercase font-bold tracking-wider">{track.artist}</p>
                            </div>
                            <div className="text-xs text-text-tertiary font-medium font-mono hidden md:block">
                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                            </div>
                        </motion.div>
                    ))
                )}
                <div style={{ height: bottomPad }} />
            </div>
        </div>
    );
};