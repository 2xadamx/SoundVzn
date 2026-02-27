import { useState, useEffect } from 'react';
import { Play, TrendingUp, Radio, Sparkles, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MetadataEngine } from '../../utils/MetadataEngine';
import clsx from 'clsx';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Tab = 'trending' | 'genres' | 'moods' | 'releases';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'trending', label: 'Top Charts', icon: TrendingUp },
    { key: 'genres', label: 'Géneros', icon: LayoutGrid },
    { key: 'moods', label: 'Moods', icon: Sparkles },
    { key: 'releases', label: 'Estrenos', icon: Radio },
];

// ─── Genre/Mood cards ─────────────────────────────────────────────────────────

const GENRES = [
    { label: 'Pop', color: 'from-pink-500/40 to-rose-600/30', emoji: '🎤' },
    { label: 'Hip-Hop', color: 'from-violet-500/40 to-purple-700/30', emoji: '🎧' },
    { label: 'Rock', color: 'from-orange-500/40 to-red-600/30', emoji: '🎸' },
    { label: 'Electronic', color: 'from-blue-400/40 to-cyan-600/30', emoji: '🎛️' },
    { label: 'Jazz', color: 'from-amber-400/40 to-yellow-600/30', emoji: '🎷' },
    { label: 'Clásica', color: 'from-emerald-400/40 to-teal-600/30', emoji: '🎻' },
    { label: 'R&B', color: 'from-fuchsia-500/40 to-pink-700/30', emoji: '✨' },
    { label: 'Latin', color: 'from-lime-400/40 to-green-600/30', emoji: '💃' },
    { label: 'Reggaeton', color: 'from-yellow-400/40 to-orange-600/30', emoji: '🔥' },
    { label: 'K-Pop', color: 'from-sky-400/40 to-blue-600/30', emoji: '⭐' },
];

const MOODS = [
    { label: 'Energético', color: 'from-red-500/40 to-orange-500/30', emoji: '⚡' },
    { label: 'Relajante', color: 'from-sky-400/40 to-indigo-500/30', emoji: '🌊' },
    { label: 'Feliz', color: 'from-yellow-400/40 to-amber-500/30', emoji: '🌤️' },
    { label: 'Melancólico', color: 'from-purple-500/40 to-violet-700/30', emoji: '🌙' },
    { label: 'Concentración', color: 'from-emerald-400/40 to-teal-600/30', emoji: '🧠' },
    { label: 'Workout', color: 'from-orange-500/40 to-red-600/30', emoji: '💪' },
];

// ─── Album Card (Tidal-style tall) ────────────────────────────────────────────

const AlbumCard = ({ data, onNavigate }: { data: any; onNavigate?: (view: string, params?: any) => void }) => (
    <motion.div
        whileHover={{ scale: 1.02, y: -6 }}
        onClick={() => onNavigate?.('album', { albumId: data.id, albumName: data.title, from: 'browse' })}
        className="group relative cursor-pointer"
    >
        {/* Imagen tall ratio 3/4 */}
        <div className="relative rounded-2xl overflow-hidden mb-3 shadow-xl border border-white/5" style={{ aspectRatio: '3/4' }}>
            <img src={data.art} alt={data.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {data.badge && (
                <div className="absolute top-3 left-3 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-white border border-white/15 uppercase tracking-wider">
                    {data.badge}
                </div>
            )}
            <div className="absolute bottom-3 right-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
                <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                </button>
            </div>
        </div>
        <h4 className="font-bold text-white/90 text-sm truncate group-hover:text-white transition-colors">{data.title}</h4>
        <p className="text-xs text-white/35 truncate mt-0.5">{data.artist}</p>
    </motion.div>
);

// ─── Genre/Mood Card ──────────────────────────────────────────────────────────

const CategoryCard = ({ item }: { item: { label: string; color: string; emoji: string } }) => (
    <motion.div
        whileHover={{ scale: 1.03, y: -4 }}
        className={clsx("relative rounded-2xl overflow-hidden cursor-pointer border border-white/5 bg-gradient-to-br", item.color)}
        style={{ aspectRatio: '2/1' }}
    >
        <div className="absolute inset-0 flex items-center justify-between px-5 py-4">
            <span className="font-bold text-white text-sm">{item.label}</span>
            <span className="text-3xl">{item.emoji}</span>
        </div>
    </motion.div>
);

// ─── Skeleton ────────────────────────────────────────────────────────────────

const Skeleton = () => (
    <div className="animate-pulse" style={{ aspectRatio: '3/4' }}>
        <div className="rounded-2xl bg-white/5 w-full h-full mb-3" />
        <div className="h-3 bg-white/5 rounded w-3/4 mb-1.5" />
        <div className="h-2.5 bg-white/5 rounded w-1/2" />
    </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export const BrowseView = ({ onNavigate }: { onNavigate?: (view: string, params?: any) => void }) => {
    const [albums, setAlbums] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>('trending');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchContent(activeTab);
    }, [activeTab]);

    const fetchContent = async (tab: Tab) => {
        setIsLoading(true);
        setAlbums([]);
        try {
            if (tab === 'trending' || tab === 'releases') {
                const results = await MetadataEngine.getTrendingAlbums(20);
                // Para estrenos, filtrar los más recientes (simulado usando los primeros resultados)
                setAlbums(tab === 'releases' ? results.slice(0, 12) : results);
            } else {
                // Para genres/moods no necesitamos datos del servidor
                setAlbums([]);
            }
        } catch {
            setAlbums([]);
        } finally {
            setIsLoading(false);
        }
    };

    const showGrid = activeTab === 'trending' || activeTab === 'releases';
    const showCategories = activeTab === 'genres' || activeTab === 'moods';
    const categories = activeTab === 'genres' ? GENRES : MOODS;

    return (
        <div className="space-y-8 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Explorar</h1>
                    <p className="text-white/30 text-xs tracking-[0.25em] uppercase">Descubre nueva música</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.06]">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={clsx(
                                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold transition-all duration-300 uppercase tracking-wider",
                                activeTab === tab.key
                                    ? "bg-white text-black shadow-lg"
                                    : "text-white/30 hover:text-white/60"
                            )}
                        >
                            <tab.icon size={11} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Album/release grid */}
                    {showGrid && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                            {isLoading
                                ? Array.from({ length: 15 }).map((_, i) => <Skeleton key={i} />)
                                : albums.map((album, i) => (
                                    <motion.div
                                        key={album.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04, duration: 0.3 }}
                                    >
                                        <AlbumCard data={album} onNavigate={onNavigate} />
                                    </motion.div>
                                ))
                            }
                        </div>
                    )}

                    {/* Genre/Mood grid */}
                    {showCategories && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {categories.map((cat, i) => (
                                <motion.div
                                    key={cat.label}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <CategoryCard item={cat} />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
