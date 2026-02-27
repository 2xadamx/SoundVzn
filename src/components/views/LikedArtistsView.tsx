import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, User, ArrowRight } from 'lucide-react';
import { getLikedArtists } from '../../utils/database';

interface LikedArtistsViewProps {
    onNavigate: (view: string, params?: any) => void;
}

export const LikedArtistsView: React.FC<LikedArtistsViewProps> = ({ onNavigate }) => {
    const [artists, setArtists] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchArtists = async () => {
        try {
            setIsLoading(true);
            const data = await getLikedArtists();
            setArtists(data);
        } catch (error) {
            console.error('Error fetching liked artists:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchArtists();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-t-2 border-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24 animate-in fade-in duration-500">
            <header className="flex items-end gap-6">
                <div className="w-48 h-48 rounded-[32px] bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl glow-gradient">
                    <Mic size={80} className="text-white" />
                </div>
                <div className="mb-2">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-text-tertiary mb-2">Biblioteca</p>
                    <h1 className="text-6xl font-black text-white italic uppercase tracking-tighter mb-4">Artistas</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-white/60 font-medium">{artists.length} artistas seguidos</span>
                    </div>
                </div>
            </header>

            {artists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] rounded-[40px] border border-white/5 border-dashed">
                    <User size={64} className="text-text-tertiary mb-6 opacity-20" />
                    <p className="text-xl font-black uppercase tracking-widest text-text-secondary">Tu lista de artistas está vacía</p>
                    <p className="text-text-tertiary mt-2">Sigue a tus artistas favoritos para verlos aquí</p>
                    <button
                        onClick={() => onNavigate('search')}
                        className="mt-8 px-8 py-3 bg-white text-black rounded-full font-black uppercase tracking-widest hover:scale-110 transition-transform"
                    >
                        Descubrir Artistas
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                    {artists.map((artist, index) => (
                        <motion.div
                            key={artist.id || artist.name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -10 }}
                            onClick={() => onNavigate('artist', { artistId: artist.id, artistName: artist.name })}
                            className="group relative bg-white/[0.03] hover:bg-white/[0.07] p-5 rounded-[32px] border border-white/5 transition-all cursor-pointer overflow-hidden shadow-xl"
                        >
                            <div className="aspect-square rounded-full overflow-hidden mb-5 border-4 border-white/5 group-hover:border-primary-500/20 transition-all shadow-inner">
                                <img
                                    src={artist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=random&size=200`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    alt={artist.name}
                                />
                            </div>
                            <div className="text-center">
                                <h3 className="text-white font-black uppercase tracking-tight text-lg truncate mb-1">
                                    {artist.name}
                                </h3>
                                <p className="text-[10px] text-text-tertiary font-black uppercase tracking-[0.2em] opacity-50 group-hover:opacity-100 group-hover:text-primary-400 transition-all">
                                    Artista Verificado
                                </p>
                            </div>

                            {/* Hover overlay with arrow */}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="text-primary-400" size={20} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};
