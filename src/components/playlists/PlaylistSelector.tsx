import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, ListMusic, Check, Search } from 'lucide-react';
import { getAllPlaylists, addTrackToPlaylist, createPlaylist } from '../../utils/database';
import { Track } from '../../types';
import clsx from 'clsx';

interface PlaylistSelectorProps {
    track: Track | null;
    onClose: () => void;
}

export const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({ track, onClose }) => {
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [addedId, setAddedId] = useState<string | null>(null);

    useEffect(() => {
        loadPlaylists();
    }, []);

    const loadPlaylists = async () => {
        const data = await getAllPlaylists();
        setPlaylists(data);
    };

    const handleAddToPlaylist = async (playlistId: string) => {
        if (!track) return;
        await addTrackToPlaylist(playlistId, track.id);
        setAddedId(playlistId);
        setTimeout(() => {
            onClose();
        }, 1000);
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;
        const id = await createPlaylist(newPlaylistName);
        if (track) {
            await addTrackToPlaylist(id, track.id);
        }
        setIsCreating(false);
        setNewPlaylistName('');
        loadPlaylists();
        setAddedId(id);
        setTimeout(() => {
            onClose();
        }, 1000);
    };

    const filteredPlaylists = playlists.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!track) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-[40px] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Añadir a Playlist</h2>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Colección Exclusiva</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 pt-2">
                    {/* Track Preview */}
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-3xl mb-6 border border-white/5">
                        <img src={track.artwork} className="w-12 h-12 rounded-xl object-cover shadow-lg" alt="" />
                        <div className="min-w-0">
                            <p className="font-black text-white truncate uppercase italic tracking-tight">{track.title}</p>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{track.artist}</p>
                        </div>
                    </div>

                    {!isCreating ? (
                        <>
                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar playlist..."
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-primary/40 outline-none transition-all"
                                />
                            </div>

                            {/* List */}
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all group border border-dashed border-white/10"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Plus size={20} />
                                    </div>
                                    <span className="font-bold text-white/80 uppercase tracking-widest text-xs italic">Nueva Playlist</span>
                                </button>

                                {filteredPlaylists.map((playlist) => (
                                    <button
                                        key={playlist.id}
                                        onClick={() => handleAddToPlaylist(playlist.id)}
                                        disabled={addedId !== null}
                                        className={clsx(
                                            "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                                            addedId === playlist.id ? "bg-green-500/20 border border-green-500/20" : "hover:bg-white/5"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary group-hover:scale-110 transition-all">
                                                <ListMusic size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-black text-sm text-white uppercase italic tracking-tight">{playlist.name}</p>
                                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{playlist.trackIds.length} canciones</p>
                                            </div>
                                        </div>
                                        {addedId === playlist.id && (
                                            <Check size={18} className="text-green-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <input
                                autoFocus
                                type="text"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                placeholder="Nombre de la playlist..."
                                className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-6 py-4 text-white font-black italic uppercase tracking-tight focus:border-primary/40 outline-none transition-all shadow-inner"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-4 rounded-2xl border border-white/10 text-white/40 font-black uppercase text-xs tracking-widest hover:bg-white/5 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreatePlaylist}
                                    className="flex-[2] py-4 bg-white text-dark-950 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                                >
                                    Crear y Añadir
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};
