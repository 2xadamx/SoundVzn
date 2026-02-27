import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Music, Play, Trash2, Download, Loader2, ChevronLeft, Crown, GripVertical } from 'lucide-react';
import { createPlaylist, getAllPlaylists, getPlaylistTracks, removeTrackFromPlaylist, getProfile, reorderTracksInPlaylist } from '@utils/database';
import { usePlayerStore } from '@store/player';
import { notificationService } from '@services/notificationService';
import { Track } from '../../types';
import { shallow } from 'zustand/shallow';
import { Reorder } from 'framer-motion';

interface Playlist {
    id: string;
    name: string;
    description?: string;
    trackIds: string[];
    createdDate: number;
}

// ─── Playlist Card ───────────────────────────────────────────────────────────
const PlaylistCard = React.memo(({ playlist, artworks, onClick }: {
    playlist: Playlist;
    artworks: string[];
    onClick: () => void;
}) => (
    <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-white/[0.03] border border-white/[0.06] hover:border-white/15 rounded-3xl p-5 cursor-pointer group transition-all duration-400 relative overflow-hidden"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Dynamic cover */}
        <div className="w-full mb-4 rounded-2xl overflow-hidden border border-white/[0.06] shadow-xl" style={{ aspectRatio: '1/1' }}>
            {artworks.length === 0 ? (
                <div className="w-full h-full bg-white/[0.04] flex items-center justify-center">
                    <Music size={40} className="text-white/15" />
                </div>
            ) : artworks.length === 1 ? (
                <img src={artworks[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
            ) : (
                <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="overflow-hidden bg-white/5">
                            {artworks[i] ? <img src={artworks[i]} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-white/[0.03]" />}
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="relative z-10">
            <h3 className="font-bold text-white/90 text-base truncate group-hover:text-white transition-colors">{playlist.name}</h3>
            <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-white/30">{playlist.trackIds.length} {playlist.trackIds.length === 1 ? 'pista' : 'pistas'}</p>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-white/60 transition-colors" />
            </div>
        </div>
    </motion.div>
));

export const PlaylistsView: React.FC = () => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [playlistArtworks, setPlaylistArtworks] = useState<Record<string, string[]>>({});
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
    const [userTier, setUserTier] = useState<'standard' | 'pro'>('standard');
    const [isDownloading, setIsDownloading] = useState(false);

    const { setCurrentTrack, setQueue, setIsPlaying, setCurrentIndex } = usePlayerStore(
        (state) => ({
            setCurrentTrack: state.setCurrentTrack,
            setQueue: state.setQueue,
            setIsPlaying: state.setIsPlaying,
            setCurrentIndex: state.setCurrentIndex,
        }),
        shallow
    );

    // Virtualization (Disabled for Reorder support, kept ref for list scrolling)

    useEffect(() => {
        loadPlaylists();
        getProfile().then(p => setUserTier(p.tier));
    }, []);

    const loadPlaylists = async () => {
        const data = await getAllPlaylists();
        setPlaylists(data);
        // Pre-cargar artworks para portadas dinámicas
        const artworkMap: Record<string, string[]> = {};
        await Promise.all(data.map(async (pl: Playlist) => {
            const tracks = await getPlaylistTracks(pl.id);
            artworkMap[pl.id] = tracks.slice(0, 4).map((t: any) => t.artwork).filter(Boolean);
        }));
        setPlaylistArtworks(artworkMap);
    };

    const handleCreate = async () => {
        if (!newPlaylistName.trim()) return;
        try {
            await createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim() || undefined);
            setNewPlaylistName('');
            setNewPlaylistDesc('');
            setShowCreateModal(false);
            loadPlaylists();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleSelectPlaylist = async (playlist: Playlist) => {
        setSelectedPlaylist(playlist);
        const tracks = await getPlaylistTracks(playlist.id);
        setPlaylistTracks(tracks);
    };

    const handlePlayPlaylist = () => {
        if (playlistTracks.length === 0) return;
        const tracks: Track[] = playlistTracks.map(t => ({ ...t, favorite: t.favorite || false, dateAdded: t.dateAdded || new Date(t.addedDate).toISOString() }));
        setQueue(tracks);
        setCurrentTrack(tracks[0]);
        setCurrentIndex(0);
        setIsPlaying(true);
    };

    const handlePlayTrack = (_: any, index: number) => {
        const tracks: Track[] = playlistTracks.map(t => ({ ...t, favorite: t.favorite || false, dateAdded: t.dateAdded || new Date(t.addedDate).toISOString() }));
        setQueue(tracks);
        setCurrentTrack(tracks[index]);
        setCurrentIndex(index);
        setIsPlaying(true);
    };

    const handleDownloadPlaylist = async () => {
        if (userTier !== 'pro') {
            alert('Las descargas de playlists completas son función SoundVizion Pro.');
            return;
        }
        if (playlistTracks.length === 0 || isDownloading) return;
        const label = selectedPlaylist?.name || 'Playlist';
        notificationService.downloadStarted(label);
        setIsDownloading(true);
        try {
            for (const track of playlistTracks) {
                if ((window as any).electron?.downloadTrack) {
                    await (window as any).electron.downloadTrack(track.id, track.title, track.artist);
                }
            }
            notificationService.downloadCompleted(label);
        } catch (error: any) {
            console.error('Playlist download failed:', error);
            notificationService.downloadFailed(label);
        } finally {
            setIsDownloading(false);
        }
    };

    // ─── Playlist Detail View ───────────────────────────────────────────────
    if (selectedPlaylist) {
        const coverArts = playlistArtworks[selectedPlaylist.id] || [];
        return (
            <div className="space-y-6 animate-in fade-in duration-300 pb-24">
                <button
                    onClick={() => setSelectedPlaylist(null)}
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
                >
                    <ChevronLeft size={16} />
                    Mis Playlists
                </button>

                {/* Hero */}
                <div className="flex items-end gap-8 p-8 bg-white/[0.03] rounded-3xl border border-white/[0.06] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full pointer-events-none" />

                    <div className="w-52 h-52 flex-shrink-0 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                        {coverArts.length === 0 ? (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center"><Music size={60} className="text-white/15" /></div>
                        ) : coverArts.length === 1 ? (
                            <img src={coverArts[0]} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="overflow-hidden bg-white/5">
                                        {coverArts[i] ? <img src={coverArts[i]} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-white/[0.03]" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 pb-2 relative z-10">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-3">Playlist · {new Date(selectedPlaylist.createdDate).getFullYear()}</p>
                        <h1 className="text-5xl font-bold text-white tracking-tight mb-3">{selectedPlaylist.name}</h1>
                        {selectedPlaylist.description && (
                            <p className="text-white/40 text-sm mb-5 max-w-md">{selectedPlaylist.description}</p>
                        )}
                        <div className="flex items-center gap-4">
                            {playlistTracks.length > 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                    onClick={handlePlayPlaylist}
                                    className="flex items-center gap-2 px-7 py-3 bg-white text-black rounded-2xl font-bold text-sm shadow-xl"
                                >
                                    <Play size={18} fill="currentColor" />
                                    Reproducir
                                </motion.button>
                            )}
                            {playlistTracks.length > 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                    onClick={handleDownloadPlaylist}
                                    disabled={isDownloading}
                                    className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    {userTier !== 'pro' ? <Crown size={12} className="text-amber-400" /> : null}
                                </motion.button>
                            )}
                            <span className="text-sm text-white/25">{playlistTracks.length} pistas</span>
                        </div>
                    </div>
                </div>

                <div
                    className="max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar"
                >
                    {playlistTracks.length === 0 ? (
                        <div className="py-16 text-center">
                            <Music size={32} className="mx-auto mb-3 text-white/15" />
                            <p className="text-white/30 text-sm">Esta playlist está vacía</p>
                            <p className="text-white/15 text-xs mt-1">Busca canciones y añádelas con el botón +</p>
                        </div>
                    ) : (
                        <Reorder.Group
                            axis="y"
                            values={playlistTracks}
                            onReorder={async (newOrder: any[]) => {
                                setPlaylistTracks(newOrder);
                                const newIds = newOrder.map(t => t.id);
                                await reorderTracksInPlaylist(selectedPlaylist.id, newIds);
                            }}
                            className="space-y-1"
                        >
                            {playlistTracks.map((track, index) => (
                                <Reorder.Item
                                    key={track.id}
                                    value={track}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative"
                                >
                                    <div
                                        onClick={() => handlePlayTrack(track, index)}
                                        className="flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:border-white/[0.06] hover:bg-white/[0.03] active:bg-white/[0.05] cursor-pointer group transition-all"
                                    >
                                        <div className="flex items-center gap-2 w-10 justify-center">
                                            <div className="cursor-grab active:cursor-grabbing text-white/10 group-hover:text-white/40 transition-colors">
                                                <GripVertical size={14} />
                                            </div>
                                            <span className="text-white/20 text-[10px] font-mono group-hover:text-white/50 transition-colors">{index + 1}</span>
                                        </div>

                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/5 relative">
                                            {track.artwork ? (
                                                <img src={track.artwork} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/20"><Music size={16} /></div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Play size={16} className="text-white fill-current" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white/80 group-hover:text-white transition-colors truncate">{track.title}</p>
                                            <p className="text-xs text-white/30 truncate">{track.artist}</p>
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.1, color: '#ef4444' }}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await removeTrackFromPlaylist(selectedPlaylist.id, track.id);
                                                handleSelectPlaylist(selectedPlaylist);
                                            }}
                                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/20 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </motion.button>
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                    )}
                </div>
            </div>
        );
    }

    // ─── Playlist Grid View ─────────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Mis Playlists</h1>
                    <p className="text-white/30 text-xs tracking-[0.25em] uppercase">{playlists.length} colecciones</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-2xl font-bold text-xs shadow-xl"
                >
                    <Plus size={15} strokeWidth={3} />
                    Nueva
                </motion.button>
            </div>

            {playlists.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Music size={36} className="text-white/20" />
                    </div>
                    <h3 className="text-xl font-bold text-white/30 mb-2">Sin playlists aún</h3>
                    <p className="text-white/20 text-sm">Crea tu primera colección y organiza tu música</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-6 px-6 py-3 bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/15 transition-all"
                    >
                        + Crear playlist
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {playlists.map((playlist, i) => (
                        <motion.div
                            key={playlist.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                        >
                            <PlaylistCard
                                playlist={playlist}
                                artworks={playlistArtworks[playlist.id] || []}
                                onClick={() => handleSelectPlaylist(playlist)}
                            />
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0d0d18] border border-white/10 rounded-3xl p-7 w-full max-w-sm shadow-2xl"
                        >
                            <h2 className="text-xl font-bold text-white mb-5">Nueva Playlist</h2>
                            <input
                                type="text"
                                value={newPlaylistName}
                                onChange={e => setNewPlaylistName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                placeholder="Nombre de la playlist"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 mb-3 transition-all"
                                autoFocus
                            />
                            <textarea
                                value={newPlaylistDesc}
                                onChange={e => setNewPlaylistDesc(e.target.value)}
                                placeholder="Descripción (opcional)"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 mb-5 h-20 resize-none transition-all"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 bg-white/5 rounded-2xl text-sm font-bold text-white/40 hover:text-white/70 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newPlaylistName.trim()}
                                    className="flex-1 py-3 bg-white text-black rounded-2xl text-sm font-bold disabled:opacity-40 hover:bg-white/90 transition-all"
                                >
                                    Crear
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
