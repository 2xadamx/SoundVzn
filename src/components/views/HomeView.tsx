import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MetadataEngine } from '../../utils/MetadataEngine';
import { usePlayerStore } from '../../store/player';
import { getAllTracks } from '../../utils/database';
import { notificationService } from '@services/notificationService';
import { Play, Sparkles, TrendingUp, Users, ChevronRight, Clock, Heart, Download, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { shallow } from 'zustand/shallow';

interface HomeViewProps {
    onNavigate?: (view: string, params?: any) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getImg = (item: any) => {
    const art = item?.artwork;
    if (!art) return '';
    if (typeof art === 'string') return art;
    return art.large || art.medium || art.small || art.url || '';
};

const trackKey = (item: any, i: number) =>
    `${item.id || 'track'}-${i}-${item?.externalIds?.deezer || 'src'}`;

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 6) return 'Buenas noches 🌙';
    if (h < 12) return 'Buenos días ☀️';
    if (h < 20) return 'Buenas tardes 🎵';
    return 'Buenas noches 🌙';
};


// ─── Skeletons ────────────────────────────────────────────────────────────────

const SkeletonCard = ({ tall }: { tall?: boolean }) => (
    <div className="animate-pulse">
        <div className={clsx("rounded-2xl bg-white/5 w-full mb-3", tall ? "aspect-[3/4]" : "aspect-square")} />
        <div className="h-3 bg-white/5 rounded w-3/4 mb-2" />
        <div className="h-2.5 bg-white/5 rounded w-1/2" />
    </div>
);

const SkeletonRow = () => (
    <div className="flex items-center gap-4 animate-pulse py-3">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex-shrink-0" />
        <div className="flex-1">
            <div className="h-3 bg-white/5 rounded w-2/3 mb-2" />
            <div className="h-2.5 bg-white/5 rounded w-1/3" />
        </div>
    </div>
);

// ─── Reusable Track Card with Actions ─────────────────────────────────────────

interface TrackCardProps {
    item: any;
    onPlay: (item: any) => void;
    onToggleFavorite: (item: any) => void;
    onDownload: (item: any) => void;
}

const TrackCard = React.memo(({ item, onPlay, onToggleFavorite, onDownload }: TrackCardProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const { currentTrack } = usePlayerStore();
    const isPlayingThis = currentTrack?.id === item.id;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={() => onPlay(item)}
            className="cursor-pointer group relative"
        >
            <div className="relative rounded-2xl overflow-hidden mb-3 border border-white/5 shadow-lg aspect-square">
                {getImg(item) ? (
                    <img
                        src={getImg(item)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        alt=""
                    />
                ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/10 text-4xl">♪</div>
                )}

                {/* Overlays */}
                <div className={clsx(
                    "absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center gap-3",
                    isHovered ? "opacity-100" : "opacity-0"
                )}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(item); }}
                        className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            item.favorite ? "bg-primary-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                        )}
                    >
                        <Heart size={18} fill={item.favorite ? "currentColor" : "none"} />
                    </button>
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-2xl scale-90 hover:scale-100 transition-transform">
                        <Play size={24} fill="black" className="ml-1" />
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDownload(item); }}
                        className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all"
                    >
                        <Download size={18} />
                    </button>
                </div>

                {/* Subtle playing indicator */}
                {isPlayingThis && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_10px_#0ea5e9]" />
                )}
            </div>

            <p className={clsx(
                "text-sm font-bold truncate leading-tight transition-colors",
                isPlayingThis ? "text-primary-400" : "text-white/85 group-hover:text-white"
            )}>
                {item.title}
            </p>
            <p className="text-[10px] text-white/35 truncate mt-0.5">{item.artist}</p>
        </motion.div>
    );
});

// ─── Section Header ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
    icon: React.ElementType;
    title: string;
    action?: { label: string; onClick: () => void };
}

const SectionHeader = React.memo(({ icon: Icon, title, action }: SectionHeaderProps) => (
    <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
            <Icon size={16} className="text-white/40" />
            <h2 className="text-sm font-bold text-white/80 tracking-tight">{title}</h2>
        </div>
        {action && (
            <button
                onClick={action.onClick}
                className="flex items-center gap-1 text-[10px] font-bold text-white/30 hover:text-white/70 transition-all tracking-tight"
            >
                {action.label}
                <ChevronRight size={11} />
            </button>
        )}
    </div>
));

// ─── Spotlight Hero ────────────────────────────────────────────────────────────

interface SpotlightHeroProps {
    item: any;
    onPlay: () => void;
    onArtist: () => void;
}

const SpotlightHero = React.memo(({ item, onPlay, onArtist }: SpotlightHeroProps) => (
    <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative h-[320px] md:h-[420px] rounded-[40px] overflow-hidden cursor-pointer group border border-white/5 shadow-2xl shadow-black/80"
        onClick={onPlay}
    >
        {getImg(item) && (
            <img
                src={getImg(item)}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms] ease-out"
                alt={item.title}
            />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

        <div className="absolute top-8 left-8 flex items-center gap-2 bg-white/10 backdrop-blur-2xl border border-white/15 rounded-full px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-white tracking-tight">Destacado</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-10 md:p-12">
            <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-bold text-primary-400 tracking-tight mb-3"
            >
                {item.artist}
            </motion.p>
            <motion.h2
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] mb-8 max-w-3xl"
            >
                {item.title}
            </motion.h2>
            <div className="flex items-center gap-5">
                <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); onPlay(); }}
                    className="flex items-center gap-3 px-10 py-4 bg-white text-black rounded-2xl font-black text-sm shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:bg-white/90 transition-all"
                >
                    <Play size={18} fill="currentColor" />
                    Reproducir
                </motion.button>
                <button
                    onClick={(e) => { e.stopPropagation(); onArtist(); }}
                    className="px-8 py-4 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl text-sm font-bold text-white hover:text-white hover:bg-white/20 transition-all"
                >
                    Ver artista
                </button>
            </div>
        </div>
    </motion.section>
));


// ─── Main Component ────────────────────────────────────────────────────────────

type FeedMode = 'todos' | 'para-ti';

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [historyTracks, setHistoryTracks] = useState<any[]>([]);
    const [feedMode, setFeedMode] = useState<FeedMode>('para-ti');
    const { playUnifiedTrack, currentTrack, toggleFavorite } = usePlayerStore(
        (state) => ({
            playUnifiedTrack: state.playUnifiedTrack,
            currentTrack: state.currentTrack,
            toggleFavorite: state.toggleFavorite,
        }),
        shallow
    );
    const hasFetched = useRef(false);

    const loadHistory = async () => {
        const localTracks = await getAllTracks();
        const recentlyPlayed = localTracks
            .filter((t: any) => t.lastPlayed)
            .sort((a: any, b: any) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
            .slice(0, 20); // Usuarios quieren top 20
        setHistoryTracks(recentlyPlayed);
        return recentlyPlayed;
    };

    const hydrateTracks = (tracks: any[], favorites: any[]) => {
        return tracks.map(t => ({
            ...t,
            favorite: favorites.some(f => f.id === t.id || (t.externalIds?.deezer && f.id === t.externalIds.deezer))
        }));
    };

    useEffect(() => {
        const load = async (force = false) => {
            try {
                if (force) setIsLoading(true);
                const localTracks = await getAllTracks();
                const favorites = localTracks.filter(t => t.favorite);
                const recentlyPlayed = localTracks
                    .filter((t: any) => t.lastPlayed)
                    .sort((a: any, b: any) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
                    .slice(0, 20);

                setHistoryTracks(recentlyPlayed);

                const seed = currentTrack || (recentlyPlayed[0] ? {
                    title: recentlyPlayed[0].title,
                    artist: recentlyPlayed[0].artist,
                } : null);

                const homeData = await MetadataEngine.getHomeDashboard(seed as any, force || !hasFetched.current);
                if (homeData) {
                    // Hydrate everything!
                    setData({
                        ...homeData,
                        spotlight: homeData.spotlight ? hydrateTracks([homeData.spotlight], favorites)[0] : null,
                        recommendations: hydrateTracks(homeData.recommendations || [], favorites),
                        trending: hydrateTracks(homeData.trending || [], favorites),
                        trends: hydrateTracks(homeData.trends || [], favorites),
                        topSpain: hydrateTracks(homeData.topSpain || [], favorites),
                    });
                }
            } catch (err) {
                console.warn('HomeView load error:', err);
            } finally {
                setIsLoading(false);
                hasFetched.current = true;
            }
        };

        load(true); // Siempre forzar el primer load para evitar el problema de los "10 días"

        const interval = setInterval(() => {
            load(false);
        }, 5 * 60 * 1000); // Bajar a 5 min

        return () => clearInterval(interval);
    }, []);

    // Refresh history when track changes
    useEffect(() => {
        loadHistory();
    }, [currentTrack?.id]);

    const handlePlay = (item: any) => playUnifiedTrack(item, { type: 'search', id: 'home', name: 'Inicio' });

    const handleDownload = async (track: any) => {
        if (!window.electron?.downloadTrack) {
            console.warn('Electron downloadTrack not available');
            return;
        }

        const label = track.title || track.artist || 'track';
        notificationService.downloadStarted(label);

        try {
            const result = await (window.electron as any).downloadTrack(track.id, track.title, track.artist);
            if (result?.success) {
                notificationService.downloadCompleted(label);
            } else {
                notificationService.downloadFailed(label);
            }
        } catch (error: any) {
            console.error('HomeView download error:', error);
            notificationService.downloadFailed(label);
        }
    };

    const handleToggleFavorite = async (track: any) => {
        const isFav = !track.favorite;
        await toggleFavorite(track, isFav);
        // Optimistic local update
        if (data) {
            const updateItem = (item: any) => item.id === track.id ? { ...item, favorite: isFav } : item;
            setData({
                ...data,
                spotlight: data.spotlight && data.spotlight.id === track.id ? { ...data.spotlight, favorite: isFav } : data.spotlight,
                recommendations: (data.recommendations || []).map(updateItem),
                trending: (data.trending || []).map(updateItem),
                trends: (data.trends || []).map(updateItem),
                topSpain: (data.topSpain || []).map(updateItem),
            });
        }
        // Force history refresh to show current like state
        loadHistory();
    };

    const spotlight = data?.spotlight;
    const recommendations: any[] = data?.recommendations || [];
    const trending: any[] = data?.trends || data?.trending || [];
    const artists: any[] = data?.artists || [];
    const paraTimItems: any[] = feedMode === 'para-ti'
        ? [...recommendations.slice(0, 5), ...(data?.topSpain?.slice(0, 5) || trending.slice(0, 5))]
        : trending.slice(0, 10);


    return (
        <div className="space-y-16 pb-32 px-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-6xl font-black text-white tracking-tighter leading-none mb-3 italic select-none">
                        Inicio
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary-500" />
                        <p className="text-white/40 text-xs font-bold">{getGreeting()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 backdrop-blur-3xl rounded-3xl p-1.5 shadow-2xl">
                    {(['para-ti', 'todos'] as FeedMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setFeedMode(mode)}
                            className={clsx(
                                "px-6 py-3 rounded-2xl text-[10px] font-bold transition-all duration-500",
                                feedMode === mode
                                    ? "bg-white text-black shadow-[0_10px_20px_rgba(255,255,255,0.1)] scale-100"
                                    : "text-white/30 hover:text-white/60 hover:bg-white/5 scale-95"
                            )}
                        >
                            {mode === 'para-ti' ? 'Para Ti' : 'Todo'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Spotlight */}
            {isLoading ? (
                <div className="h-[420px] rounded-[40px] bg-white/5 animate-pulse" />
            ) : spotlight && (
                <SpotlightHero
                    item={spotlight}
                    onPlay={() => handlePlay(spotlight)}
                    onArtist={() => onNavigate?.('artist', { artistName: spotlight.artist, from: 'home' })}
                />
            )}


            {/* Feed Inteligente */}
            <section>
                <SectionHeader
                    icon={Sparkles}
                    title={feedMode === 'para-ti' ? 'Tu Selección Inteligente' : 'Lo Más Hot Actualmente'}
                    action={{ label: 'Ver más', onClick: () => onNavigate?.('browse') }}
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
                    {isLoading ? (
                        Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
                    ) : (
                        paraTimItems.map((item, i) => (
                            <TrackCard
                                key={trackKey(item, i)}
                                item={item}
                                onPlay={handlePlay}
                                onToggleFavorite={handleToggleFavorite}
                                onDownload={handleDownload}
                            />
                        ))
                    )}
                </div>
            </section>

            {/* Trending Charts */}
            <section>
                <SectionHeader
                    icon={TrendingUp}
                    title="Top Charts · Tendencias Mundiales"
                    action={{ label: 'Explorar', onClick: () => onNavigate?.('browse') }}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                    ) : (
                        trending.slice(0, 10).map((item, i) => (
                            <motion.div
                                key={trackKey(item, i)}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="group flex items-center gap-4 p-4 rounded-3xl border border-transparent hover:border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer"
                                onClick={() => handlePlay(item)}
                            >
                                <span className="w-6 text-[10px] font-black text-white/20 group-hover:text-primary-500 transition-colors">
                                    {(i + 1).toString().padStart(2, '0')}
                                </span>
                                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 border border-white/5 relative flex-shrink-0 shadow-lg">
                                    {getImg(item) ? (
                                        <img src={getImg(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/10 italic font-black">S</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white group-hover:text-primary-400 truncate transition-colors leading-tight">
                                        {item.title}
                                    </p>
                                    <p className="text-[10px] font-bold text-white/30 mt-1">
                                        {item.artist}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item); }}
                                        className={clsx("p-2 rounded-full transition-colors", item.favorite ? "text-primary-500" : "text-white/20 hover:text-white")}
                                    >
                                        <Heart size={16} fill={item.favorite ? "currentColor" : "none"} />
                                    </button>
                                    <button className="p-2 rounded-full text-white/20 hover:text-white">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </section>

            {/* Artistas recomendados */}
            {artists.length > 0 && (
                <section>
                    <SectionHeader icon={Users} title="Artistas que podrían gustarte" />
                    <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide -mx-2 px-2">
                        {artists.slice(0, 12).map((artist, i) => (
                            <motion.button
                                key={artist.id || i}
                                whileHover={{ y: -5 }}
                                onClick={() => onNavigate?.('artist', { artistId: artist.id, artistName: artist.name, from: 'home' })}
                                className="flex flex-col items-center gap-4 flex-shrink-0 group"
                            >
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/5 group-hover:border-primary-500/50 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                    {artist.image ? (
                                        <img src={artist.image} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" alt={artist.name} />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20 font-black text-4xl italic">
                                            {artist.name?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black text-white/80 group-hover:text-white transition-colors uppercase tracking-widest">
                                        {artist.name}
                                    </p>
                                    <p className="text-[9px] font-bold text-white/20 uppercase mt-1 tracking-tighter">Artista Sugerido</p>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </section>
            )}

            {/* Historial Reciente */}
            {historyTracks.length > 0 && (
                <section>
                    <SectionHeader
                        icon={Clock}
                        title="Tus últimas reproducciones"
                        action={{ label: 'Ver todo', onClick: () => onNavigate?.('library') }}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
                        {historyTracks.slice(0, 10).map((item, i) => (
                            <TrackCard
                                key={`hist-${trackKey(item, i)}`}
                                item={item}
                                onPlay={handlePlay}
                                onToggleFavorite={handleToggleFavorite}
                                onDownload={handleDownload}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};
