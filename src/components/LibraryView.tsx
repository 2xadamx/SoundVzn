import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Music, Heart, Clock, Play, Search, ListPlus, Download, CheckCircle2, LayoutGrid, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlaylistSelector } from './playlists/PlaylistSelector';
import { MetadataEditor } from './player/MetadataEditor';
import { getAllTracks, getFavorites, getProfile } from '@utils/database';
import { usePlayerStore } from '@store/player';
import { Track } from '../types';
import clsx from 'clsx';

const STANDARD_LIMIT = 300;

type Filter = 'favorites' | 'downloads' | 'recent' | 'all';

interface LibraryViewProps {
    onNavigate?: (view: string, params?: any) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = () => {
    const [tracks, setTracks] = useState<any[]>([]);
    const [filter, setFilter] = useState<Filter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);
    const [selectedTrackForEdit, setSelectedTrackForEdit] = useState<Track | null>(null);
    const [userTier, setUserTier] = useState<'standard' | 'pro'>('standard');
    const [totalCount, setTotalCount] = useState(0);

    const listRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(400);
    const ROW_HEIGHT = 72;
    const OVERSCAN = 6;

    const loadTracks = useCallback(async () => {
        let data: any[];

        switch (filter) {
            case 'favorites':
                data = await getFavorites();
                break;
            case 'downloads': {
                const all = await getAllTracks();
                data = all.filter(t => t.filePath && !t.filePath.startsWith('http') && !t.filePath.includes('youtube.com'));
                break;
            }
            case 'recent': {
                const recentAll = await getAllTracks();
                data = recentAll
                    .filter(t => t.lastPlayed)
                    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
                    .slice(0, 20);
                break;
            }
            default:
                data = await getAllTracks();
        }

        setTotalCount(data.length);
        if (userTier === 'standard' && (filter === 'favorites' || filter === 'downloads')) {
            data = data.slice(0, STANDARD_LIMIT);
        }
        setTracks(data);
    }, [filter, userTier]);

    useEffect(() => {
        loadTracks();
    }, [loadTracks]);

    useEffect(() => {
        getProfile().then(p => setUserTier(p.tier));
    }, []);

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        const update = () => setViewportHeight(el.clientHeight || 400);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const filteredTracks = searchQuery
        ? tracks.filter(t =>
            t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.artist?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : tracks;

    const { visibleTracks, offsetY, bottomPad } = useMemo(() => {
        const total = filteredTracks.length * ROW_HEIGHT;
        if (filteredTracks.length === 0) {
            return { visibleTracks: [] as Array<{ track: any; index: number }>, offsetY: 0, bottomPad: 0 };
        }
        const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
        const endIndex = Math.min(
            filteredTracks.length - 1,
            Math.floor((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN
        );
        const visible = filteredTracks.slice(startIndex, endIndex + 1).map((track, idx) => ({
            track,
            index: startIndex + idx,
        }));
        const used = visible.length * ROW_HEIGHT;
        const top = startIndex * ROW_HEIGHT;
        const bottom = Math.max(0, total - top - used);
        return { visibleTracks: visible, offsetY: top, bottomPad: bottom };
    }, [filteredTracks, scrollTop, viewportHeight]);

    const handlePlayTrack = (_track: any, index: number) => {
        const queue: Track[] = filteredTracks.map(t => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            album: t.album || 'SoundVzn Library',
            duration: t.duration || 0,
            filePath: t.filePath || t.id,
            format: t.format || 'Hi-Res',
            artwork: t.artwork,
            favorite: t.favorite || false,
            addedDate: t.addedDate || new Date().toISOString(),
            playCount: t.playCount || 0,
        }));
        usePlayerStore.getState().playUnifiedCollection(queue, index, {
            type: 'library',
            id: filter,
            name: filter === 'favorites' ? 'Tus Favoritos' : 'Tu Biblioteca'
        });
    };

    const renderEmpty = () => {
        const msgs: Record<Filter, { title: string; sub: string }> = {
            favorites: { title: 'Aún sin favoritos', sub: 'Dale ♥ a canciones para guardarlas aquí' },
            downloads: { title: 'Sin descargas', sub: 'Descarga canciones para escucharlas sin datos' },
            recent: { title: 'Sin historial', sub: 'Empieza a escuchar música' },
            all: { title: 'Biblioteca vacía', sub: 'Busca y guarda canciones' },
        };
        const msg = msgs[filter];

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6 py-24 px-8 text-center bg-white/[0.02] rounded-[40px] border border-white/[0.04]"
            >
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Music size={32} className="text-white/15" />
                </div>
                <div>
                    <p className="text-lg font-bold text-white/30 tracking-tight">{msg.title}</p>
                    <p className="text-sm text-white/20 mt-1">{msg.sub}</p>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-24 px-4 overflow-x-hidden">

            {/* TRACK LIST SECTION */}
            <section className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.35em] border border-white/10 px-2 py-0.5 rounded-full">Biblioteca</span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight mb-1">
                            Tu Música
                        </h2>
                        <p className="text-[11px] text-white/30 font-medium tracking-wide">
                            {filter === 'all' ? 'Colección completa' : filter === 'favorites' ? 'Tus favoritos' : filter === 'downloads' ? 'Descargas offline' : 'Historial reciente'}
                            {' · '}
                            <span className="font-semibold text-white/60">{totalCount}</span> pistas
                        </p>
                    </div>

                    <div className="relative group min-w-[280px]">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar en colección..."
                            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl py-3 pl-11 pr-5 text-[13px] text-white placeholder:text-white/10 focus:outline-none focus:border-white/15 w-full transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center flex-wrap gap-2 pb-2">
                    {[
                        { key: 'favorites' as Filter, label: 'Favoritos', icon: Heart },
                        { key: 'recent' as Filter, label: 'Recientes', icon: Clock },
                        { key: 'downloads' as Filter, label: 'Descargas', icon: Download },
                        { key: 'all' as Filter, label: 'Todo', icon: LayoutGrid },
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={clsx(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all border whitespace-nowrap",
                                filter === f.key
                                    ? 'bg-white text-black border-white shadow-lg'
                                    : 'bg-white/[0.02] text-white/40 border-white/[0.06] hover:text-white/70 hover:bg-white/[0.04]'
                            )}
                        >
                            <f.icon size={12} />
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Sin límites de tier */}

                {filteredTracks.length === 0 ? renderEmpty() : (
                    <div
                        ref={listRef}
                        className="max-h-[60vh] overflow-x-hidden overflow-y-auto hide-scrollbar"
                        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                    >
                        <div style={{ height: offsetY }} />
                        {visibleTracks.map(({ track, index }) => (
                            <motion.div
                                key={`${track.id}-${index}`}
                                onClick={() => handlePlayTrack(track, index)}
                                className="flex items-center gap-5 h-[72px] px-5 rounded-2xl border border-transparent hover:border-white/[0.04] hover:bg-white/[0.02] cursor-pointer group transition-all relative"
                            >
                                <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-white/30 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 rounded-r-full" />
                                <span className="text-white/10 text-[11px] w-6 text-center font-bold group-hover:text-white/30 transition-colors flex-shrink-0">{index + 1}</span>

                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 relative border border-white/5 shadow-2xl">
                                    {track.artwork ? (
                                        <img src={track.artwork} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Music size={18} className="text-white/10" /></div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play size={18} className="text-white fill-current" />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-bold text-white truncate group-hover:text-primary-400 transition-colors uppercase tracking-tight">{track.title}</p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <p className="text-[12px] text-white/30 truncate font-medium">{track.artist}</p>
                                        {track.filePath && !track.filePath.startsWith('http') && (
                                            <div className="flex items-center gap-1 text-primary-400/50 flex-shrink-0">
                                                <CheckCircle2 size={8} />
                                                <span className="text-[7px] font-black uppercase tracking-widest">Local</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {track.filePath && !track.filePath.startsWith('http') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedTrackForEdit(track as any); }}
                                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedTrackForPlaylist(track as any); }}
                                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <ListPlus size={16} />
                                    </button>
                                </div>

                                {track.favorite && <Heart size={14} className="text-red-500 fill-current flex-shrink-0 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]" />}

                                <div className="hidden md:block w-14 text-right flex-shrink-0">
                                    <span className="text-[10px] font-mono text-white/10 group-hover:text-white/30 transition-colors">
                                        {track.playCount || 0}×
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                        <div style={{ height: bottomPad }} />
                    </div>
                )}
            </section>



            <AnimatePresence>
                {selectedTrackForPlaylist && <PlaylistSelector track={selectedTrackForPlaylist} onClose={() => setSelectedTrackForPlaylist(null)} />}
                {selectedTrackForEdit && (
                    <MetadataEditor
                        track={selectedTrackForEdit}
                        onClose={() => setSelectedTrackForEdit(null)}
                        onUpdate={loadTracks}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
