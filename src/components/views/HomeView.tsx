import { motion, AnimatePresence } from 'framer-motion';
import { MetadataEngine } from '../../utils/MetadataEngine';
import { usePlayerStore } from '../../store/player';
import { useAuth } from '@store/auth';
import { getFavorites } from '@utils/database';
import { Play, Heart, Music, RefreshCw, ChevronRight, Clock, BarChart3, Disc, Plus } from 'lucide-react';
import { toSentenceCase } from '@utils/formatters';
import { PlaylistSelector } from '../playlists/PlaylistSelector';
import { useState, useCallback, useEffect } from 'react';

interface HomeViewProps {
    onNavigate?: (view: string, params?: any) => void;
}

const getTrackImage = (item: any): string => {
    const art = item?.artwork || item?.cover_url;
    if (!art) return '';
    if (typeof art === 'string') return art;
    return art.large || art.medium || art.small || art.url || '';
};

const trackKey = (item: any, i: number) =>
    item?.id ||
    item?.track_id ||
    item?.externalIds?.deezer ||
    `${item?.title || 'track'}-${i}`;

const getGreeting = (name?: string) => {
    const hour = new Date().getHours();
    let greeting = 'Buenas noches';
    if (hour >= 6 && hour < 12) greeting = 'Buenos días';
    else if (hour >= 12 && hour < 20) greeting = 'Buenas tardes';

    if (name) {
        return `${greeting}, ${name.split(' ')[0]}`;
    }
    return greeting;
};

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [continueListening, setContinueListening] = useState<any[]>([]);
    const [lastFavorite, setLastFavorite] = useState<any>(null);
    const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<any>(null);
    const { user } = useAuth();
    const playUnifiedTrack = usePlayerStore(s => s.playUnifiedTrack);
    const [loadError, setLoadError] = useState(false);

    const load = useCallback(async (force = false) => {
        setIsLoading(true);
        setLoadError(false);

        // Safety: never show spinner more than 12 seconds
        const safety = setTimeout(() => {
            setIsLoading(false);
            setLoadError(true);
        }, 12000);

        try {
            const [homeData, contTracks, favTracks] = await Promise.all([
                MetadataEngine.getHomeDashboard(null, force),
                MetadataEngine.getContinueListening(),
                getFavorites()
            ]);

            if (homeData) setData(homeData);
            setContinueListening(contTracks || []);
            if (favTracks && favTracks.length > 0) {
                const sorted = [...favTracks].sort((a, b) => (b.addedDate || 0) - (a.addedDate || 0));
                setLastFavorite(sorted[0]);
            }
        } catch (error) {
            console.error('[HomeView] Error:', error);
            setLoadError(true);
        } finally {
            clearTimeout(safety);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handlePlay = (item: any) => {
        if (!item) return;
        playUnifiedTrack(item, { type: 'library', id: 'home', name: 'Inicio' });
    };

    const recommendations = data?.recommendations || [];
    const trends = data?.trending || data?.trends || [];
    const newReleases = data?.newReleases || [];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="w-12 h-12 border-t-2 border-white/40 rounded-full animate-spin" />
                <p className="text-white/20 text-sm font-bold tracking-tight">Personalizando tu espacio...</p>
            </div>
        );
    }

    if (loadError && !data) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <RefreshCw size={24} className="text-white/30" />
                </div>
                <div className="text-center">
                    <p className="text-white/60 text-base font-bold mb-1">No se pudo conectar</p>
                    <p className="text-white/20 text-xs">Comprueba que el servidor está iniciado</p>
                </div>
                <button
                    onClick={() => load(true)}
                    className="px-6 py-2 rounded-full bg-white/8 border border-white/15 text-white/60 hover:text-white hover:bg-white/12 transition-all text-sm font-bold"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <header className="relative z-10 pt-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="text-5xl font-bold tracking-tight mb-3">
                        <span>{getGreeting(user?.name)}</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <p className="text-white/40 font-medium tracking-wide text-xs uppercase">
                                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                        <button
                            onClick={() => load(true)}
                            className="p-1.5 bg-white/[0.03] border border-white/10 rounded-full text-white/30 hover:text-white transition-all hover:scale-110 active:scale-90"
                        >
                            <RefreshCw size={12} />
                        </button>
                    </div>
                </motion.div>
            </header>


            {/* LAST LIKED TRACK — replaces static Spotlight */}
            {lastFavorite && (
                <section>
                    <motion.div
                        whileHover={{ scale: 1.003, y: -2 }}
                        className="relative h-[240px] rounded-3xl overflow-hidden border border-white/5 cursor-pointer group shadow-2xl"
                        onClick={() => handlePlay(lastFavorite)}
                    >
                        {/* Background artwork blurred */}
                        {getTrackImage(lastFavorite) && (
                            <img
                                src={getTrackImage(lastFavorite)}
                                alt={lastFavorite.title}
                                className="absolute inset-0 w-full h-full object-cover scale-110 group-hover:scale-105 transition-transform duration-700"
                                style={{ filter: 'blur(8px)' }}
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                        <div className="absolute inset-0 flex items-center gap-6 px-8">
                            {/* Album Art */}
                            {getTrackImage(lastFavorite) && (
                                <div className="w-36 h-36 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500">
                                    <img src={getTrackImage(lastFavorite)} className="w-full h-full object-cover" alt="" />
                                </div>
                            )}
                            {/* Info */}
                            <div className="min-w-0 flex-1">
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-[8px] font-black tracking-widest uppercase mb-3">
                                    <Heart size={8} className="fill-current" /> Último Like
                                </span>
                                <h2 className="text-3xl font-black tracking-tighter text-white mb-1 leading-tight truncate">
                                    {toSentenceCase(String(lastFavorite.title || lastFavorite.track_name || ''))}
                                </h2>
                                <p className="text-white/40 text-sm font-bold uppercase tracking-widest truncate">
                                    {lastFavorite.artist}
                                </p>
                                <div className="flex items-center gap-3 mt-4">
                                    <button
                                        className="px-6 py-2.5 bg-white text-black rounded-full text-[10px] font-black tracking-tight hover:bg-white/90 transition-all flex items-center gap-2 shadow-lg"
                                        onClick={(e) => { e.stopPropagation(); handlePlay(lastFavorite); }}
                                    >
                                        <Play size={12} className="fill-current" />
                                        REPRODUCIR
                                    </button>
                                    <button
                                        className="px-4 py-2.5 bg-white/5 backdrop-blur-md text-white/50 rounded-full text-[10px] font-bold tracking-tight hover:bg-white/10 transition-all border border-white/5 flex items-center gap-2"
                                        onClick={(e) => { e.stopPropagation(); setSelectedTrackForPlaylist(lastFavorite); }}
                                    >
                                        <Plus size={12} />
                                        Añadir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>
            )}

            <AnimatePresence>
                {selectedTrackForPlaylist && (
                    <PlaylistSelector 
                        track={selectedTrackForPlaylist} 
                        onClose={() => setSelectedTrackForPlaylist(null)} 
                    />
                )}
            </AnimatePresence>

            {/* Continue Listening */}
            {continueListening.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-6 px-1">
                        <div className="flex items-center gap-2.5">
                            <Clock size={20} className="text-white/40" />
                            <h2 className="text-xl font-black text-white tracking-tighter uppercase">Continuar escuchando</h2>
                        </div>
                        <button
                            onClick={() => onNavigate?.('library')}
                            className="text-white/20 hover:text-white transition-colors flex items-center gap-2 text-[9px] font-black tracking-widest">
                            HISTORIAL <ChevronRight size={12} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {continueListening.slice(0, 5).map((item: any, i: number) => (
                            <motion.button
                                key={`cont-${trackKey(item, i)}`}
                                whileHover={{ y: -6 }}
                                onClick={() => handlePlay(item)}
                                className="group relative bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-[24px] border border-white/5 transition-all text-left overflow-hidden shadow-lg"
                            >
                                <div className="aspect-square w-full rounded-[18px] overflow-hidden shadow-2xl mb-4 relative">
                                    <img src={getTrackImage(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.track_name || item.title} />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                                        <div className="w-10 h-10 bg-white/20 rounded-full backdrop-blur-xl flex items-center justify-center border border-white/10 scale-90 group-hover:scale-100 transition-transform">
                                            <Play size={16} className="text-white fill-current ml-0.5" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                                        <div className="h-full bg-primary/60 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" style={{ width: '40%' }} />
                                    </div>
                                </div>
                                <div className="px-1">
                                    <p className="text-white/90 font-black text-xs tracking-tight truncate mb-1 group-hover:text-primary transition-colors">
                                        {String(item.track_name || item.title)}
                                    </p>
                                    <p className="text-white/30 text-[9px] tracking-widest font-black uppercase truncate">
                                        {String(item.artist)}
                                    </p>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </section>
            )}

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8">
                    <div className="flex items-center gap-2.5 mb-6 px-1">
                        <Music size={20} className="text-white/40" />
                        <h2 className="text-xl font-black text-white tracking-tighter uppercase">Tu Selección</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {recommendations.slice(0, 8).map((item: any, i: number) => (
                            <motion.div
                                key={trackKey(item, i)}
                                whileHover={{ x: 6 }}
                                onClick={() => handlePlay(item)}
                                className="group flex items-center gap-4 p-2.5 rounded-[20px] bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all text-left shadow-lg cursor-pointer"
                            >
                                <div className="w-14 h-14 rounded-[14px] overflow-hidden flex-shrink-0 relative shadow-xl">
                                    <img src={getTrackImage(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.title} />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Play size={14} className="text-white fill-current" />
                                    </div>
                                </div>
                                <div className="min-w-0 pr-4 flex-1">
                                    <p className="text-white font-black text-sm tracking-tight truncate group-hover:text-primary transition-colors">{item.title}</p>
                                    <p className="text-white/30 text-[9px] font-black tracking-widest uppercase truncate mt-1">{item.artist}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedTrackForPlaylist(item); }}
                                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
                                >
                                    <Plus size={14} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <div className="flex items-center gap-2.5 mb-6 px-1">
                        <BarChart3 size={20} className="text-white/40" />
                        <h2 className="text-xl font-black text-white tracking-tighter uppercase">Tendencias</h2>
                    </div>
                    <div className="space-y-3">
                        {trends.slice(0, 5).map((item: any, i: number) => (
                            <motion.button
                                key={`trend-${trackKey(item, i)}`}
                                whileHover={{ scale: 1.02, x: 4 }}
                                onClick={() => handlePlay(item)}
                                className="w-full flex items-center gap-3.5 p-2 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-white/5 group"
                            >
                                <div className="w-10 h-10 rounded-[10px] overflow-hidden flex-shrink-0 border border-white/5 shadow-lg">
                                    <img src={getTrackImage(item)} className="w-full h-full object-cover group-hover:rotate-12 transition-all duration-500" alt={item.title} />
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                    <p className="text-white/80 font-bold text-xs truncate group-hover:text-primary transition-colors">{item.title}</p>
                                    <p className="text-white/20 text-[9px] font-black tracking-widest mt-0.5 uppercase">{item.artist}</p>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Global Trends Section */}
            {trends.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-8 px-1">
                        <div className="flex items-center gap-3">
                            <BarChart3 size={24} className="text-white/20" />
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Tendencias Mundiales</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {trends.slice(0, 12).map((item: any, i: number) => (
                            <motion.button
                                key={trackKey(item, i)}
                                whileHover={{ y: -10 }}
                                onClick={() => handlePlay(item)}
                                className="text-left group flex flex-col gap-4"
                            >
                                <div className="aspect-square w-full rounded-[36px] overflow-hidden shadow-2xl transition-all duration-700 bg-white/[0.02] relative border border-white/5 group-hover:border-white/20">
                                    <img src={getTrackImage(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" alt={item.title} />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-500">
                                        <div className="w-14 h-14 bg-white/20 rounded-full backdrop-blur-2xl flex items-center justify-center border border-white/10 scale-75 group-hover:scale-100 transition-transform duration-500">
                                            <Play size={24} className="text-white fill-current ml-1" />
                                        </div>
                                    </div>
                                </div>
                                <div className="px-2 pb-4">
                                    <p className="text-white font-black text-[15px] tracking-tight truncate leading-tight group-hover:text-primary transition-colors">{item.title}</p>
                                    <p className="text-white/30 text-[10px] tracking-[0.1em] font-bold uppercase truncate mt-1">{item.artist}</p>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </section>
            )}

            {/* New Releases Section */}
            {newReleases.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-8 px-1">
                        <div className="flex items-center gap-3">
                            <Disc size={24} className="text-white/20" />
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Nuevos Lanzamientos</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                        {newReleases.slice(0, 10).map((item: any, i: number) => (
                            <motion.button
                                key={`new-${trackKey(item, i)}`}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => handlePlay(item)}
                                className="text-center group"
                            >
                                <div className="aspect-square w-full rounded-[40px] overflow-hidden shadow-2xl mb-4 bg-white/5 relative border border-white/10">
                                    <img src={getTrackImage(item)} className="w-full h-full object-cover group-hover:rotate-3 transition-transform duration-700" alt={item.title} />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-white font-bold text-sm truncate px-2">{item.title}</p>
                                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">{item.artist}</p>
                            </motion.button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};
