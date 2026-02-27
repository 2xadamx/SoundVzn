import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Play, ListMusic } from 'lucide-react';
import { getFollowedPlaylists } from '../../utils/database';
import { Playlist } from '../../types';

export const FollowedPlaylistsView: React.FC = () => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPlaylists = async () => {
        try {
            setIsLoading(true);
            const data = await getFollowedPlaylists();
            setPlaylists(data);
        } catch (error) {
            console.error('Error fetching followed playlists:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaylists();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-t-2 border-yellow-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24 animate-in fade-in duration-500">
            <header className="flex items-end gap-6">
                <div className="w-48 h-48 rounded-[32px] bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-2xl glow-gradient">
                    <Star size={80} className="text-white fill-white" />
                </div>
                <div className="mb-2">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-text-tertiary mb-2">Biblioteca</p>
                    <h1 className="text-6xl font-black text-white italic uppercase tracking-tighter mb-4">Playlists Liked</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-white/60 font-medium">{playlists.length} colecciones guardadas</span>
                    </div>
                </div>
            </header>

            {playlists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white/[0.02] rounded-[40px] border border-white/5 border-dashed">
                    <ListMusic size={64} className="text-text-tertiary mb-6 opacity-20" />
                    <p className="text-xl font-black uppercase tracking-widest text-text-secondary">No sigues ninguna playlist aún</p>
                    <p className="text-text-tertiary mt-2">Explora y guarda playlists externas para verlas aquí</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {playlists.map((playlist, i) => (
                        <motion.div
                            key={playlist.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ scale: 1.02, y: -6 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 cursor-pointer group transition-all duration-500 hover:shadow-2xl overflow-hidden relative"
                        >
                            <div className="w-full aspect-square rounded-[24px] bg-white mb-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-700 relative shadow-xl">
                                <ListMusic size={48} className="text-black group-hover:scale-110 transition-all" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl">
                                        <Play size={24} fill="currentColor" />
                                    </div>
                                </div>
                            </div>

                            <h3 className="font-black text-xl text-white truncate tracking-tighter uppercase italic">{playlist.name}</h3>
                            <div className="flex items-center justify-between mt-3 text-text-tertiary">
                                <p className="text-[10px] font-black tracking-[0.2em] uppercase">HI-RES AUDIO</p>
                                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};
