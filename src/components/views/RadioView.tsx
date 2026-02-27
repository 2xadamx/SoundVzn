import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { radioService, RadioStation } from '../../utils/RadioService';
import { usePlayerStore } from '../../store/player';
import {
    Radio as RadioIcon,
    Search,
    Globe2,
    Flame,
    Plus,
    Play,
    ChevronRight,
    Loader2,
    Music2,
    Heart
} from 'lucide-react';

export const RadioView: React.FC = () => {
    const [stations, setStations] = useState<RadioStation[]>([]);
    const [trending, setTrending] = useState<RadioStation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Top');

    const categories = [
        { name: 'Top', icon: <Flame size={16} /> },
        { name: 'Lounge', icon: <Music2 size={16} /> },
        { name: 'Lo-Fi', icon: <Music2 size={16} /> },
        { name: 'Jazz', icon: <Music2 size={16} /> },
        { name: 'Rock', icon: <Music2 size={16} /> },
        { name: 'Worldwide', icon: <Globe2 size={16} /> },
    ];

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        const top = await radioService.getTopStations(12);
        setTrending(top);
        setStations(top);
        setIsLoading(false);
    };

    const handleCategoryClick = async (category: string) => {
        setActiveCategory(category);
        setIsLoading(true);
        let data: RadioStation[] = [];
        if (category === 'Top') {
            data = await radioService.getTopStations(12);
        } else if (category === 'Worldwide') {
            data = await radioService.getStationsByTag('jazz', 12); // Default tag for worldwide for now
        } else {
            data = await radioService.getStationsByTag(category.toLowerCase(), 12);
        }
        setStations(data);
        setIsLoading(false);
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        const results = await radioService.searchStations(searchQuery);
        setStations(results);
        setIsSearching(false);
    };

    const playStation = async (station: RadioStation) => {
        try {
            const track = radioService.mapToTrack(station);
            // Reproducción inmediata bypass YouTube
            await usePlayerStore.getState().playUnifiedTrack(track);
        } catch (error) {
            console.error('Error al sintonizar la radio:', error);
        }
    };

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-primary-500/20 rounded-2xl text-primary-400">
                            <RadioIcon size={32} />
                        </div>
                        <h1 className="text-6xl font-black text-white italic uppercase tracking-tighter drop-shadow-2xl">
                            Radio Live
                        </h1>
                    </div>
                    <p className="text-white/40 font-black uppercase tracking-[0.4em] text-[10px] opacity-50">Explora emisoras de todo el mundo en tiempo real</p>
                </div>

                <div className="flex-1 max-w-md">
                    <form
                        onSubmit={handleSearch}
                        className="relative group w-full"
                    >
                        <div className="absolute inset-0 bg-white/5 blur-xl group-hover:bg-white/10 transition-all rounded-2xl" />
                        <div className="relative flex items-center gap-3 bg-white/5 backdrop-blur-2xl border border-white/10 p-1.5 pl-4 rounded-2xl">
                            <Search className="text-white/20" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar emisora o género..."
                                className="flex-1 bg-transparent border-none outline-none text-white text-sm font-bold placeholder:text-white/20 py-2"
                            />
                            {isSearching ? (
                                <Loader2 className="animate-spin text-white/40 mr-2" size={18} />
                            ) : (
                                <button className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform">
                                    Buscar
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </header>

            {/* Categories Bar */}
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                {categories.map((cat) => (
                    <button
                        key={cat.name}
                        onClick={() => handleCategoryClick(cat.name)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border shrink-0 ${activeCategory === cat.name
                            ? 'bg-white text-black border-white shadow-xl scale-105'
                            : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white'
                            }`}
                    >
                        {cat.icon} {cat.name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Main Grid */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                            {activeCategory === 'Top' ? 'Emisoras Populares' : `Género: ${activeCategory}`}
                        </h2>
                        <div className="h-px bg-white/10 flex-1 ml-6" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence mode="popLayout">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />
                                ))
                            ) : (
                                stations.map((station) => (
                                    <motion.div
                                        layout
                                        key={station.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        onClick={() => playStation(station)}
                                        className="group flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.08] p-4 rounded-3xl cursor-pointer transition-all border border-white/5 hover:border-white/10"
                                    >
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center relative border border-white/10 shrink-0">
                                            {station.favicon ? (
                                                <img src={station.favicon} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <RadioIcon className="text-white/20" size={24} />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Play fill="white" size={20} className="text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold truncate tracking-tight">{station.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary-400">{station.country}</span>
                                                <span className="text-white/20 text-[10px]">•</span>
                                                <span className="text-white/40 text-[10px] font-bold truncate">{station.tags[0] || 'Radio'}</span>
                                            </div>
                                        </div>
                                        <button className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-white transition-all">
                                            <Heart size={18} />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Sidebar Trending */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-xl text-orange-400">
                            <Flame size={20} />
                        </div>
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Tendencias</h3>
                    </div>

                    <div className="space-y-4">
                        {trending.slice(0, 5).map((station, index) => (
                            <motion.div
                                key={station.id}
                                whileHover={{ x: 5 }}
                                onClick={() => playStation(station)}
                                className="flex items-center gap-4 p-2 rounded-2xl hover:bg-white/5 cursor-pointer group"
                            >
                                <div className="text-white/20 font-black italic text-lg w-6">{index + 1}</div>
                                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                                    <img src={station.favicon || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=200'} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-bold text-sm truncate uppercase tracking-tight italic">{station.name}</h4>
                                    <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">{station.votes} VOTOS</p>
                                </div>
                                <ChevronRight className="text-white/10 group-hover:text-white transition-colors" size={16} />
                            </motion.div>
                        ))}
                    </div>

                    <div className="bg-gradient-to-br from-primary-500/20 to-purple-500/20 p-8 rounded-[40px] border border-white/10 relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 blur-3xl animate-pulse" />
                        <h4 className="text-white font-black uppercase tracking-widest text-xs mb-3">Tu propia estación</h4>
                        <p className="text-white/40 text-[10px] leading-relaxed mb-6 uppercase font-bold tracking-widest">Añade cualquier stream directo (MP3, AAC) pegando la URL.</p>
                        <button className="w-full py-3 bg-white text-black font-black uppercase tracking-tighter text-xs rounded-2xl hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all flex items-center justify-center gap-2">
                            <Plus size={14} /> Añadir URL Personal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
