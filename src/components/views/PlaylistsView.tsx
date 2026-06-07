import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Plus, Music, Play, Trash2, Download, Loader2, ChevronLeft, Crown, GripVertical, Globe, Lock, Search, Disc } from 'lucide-react';
import { createPlaylist, getAllPlaylists, getPlaylistTracks, removeTrackFromPlaylist, getProfile, reorderTracksInPlaylist, togglePlaylistPrivacy, getAllTracks, addTrackToPlaylist } from '@utils/database';
import { usePlayerStore } from '@store/player';
import { notificationService } from '@services/notificationService';
import { shallow } from 'zustand/shallow';
import { Reorder } from 'framer-motion';
import { toSentenceCase } from '../../utils/formatters';
import { useAuth } from '@store/auth';
import { safeImageSrc } from '@utils/imageUrl';

interface Playlist {
    id: string;
    name: string;
    description?: string;
    trackIds: string[];
    createdDate: number;
    isPublic: boolean;
    artwork?: string;
    isVirtual?: boolean;
}

const PlaylistCard = React.memo(({ playlist, artworks, onClick }: {
    playlist: Playlist;
    artworks: string[];
    onClick: () => void;
}) => (
    <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="flex flex-col gap-3 cursor-pointer group"
    >
        {/* Dynamic cover */}
        <div className="w-full relative rounded-[32px] overflow-hidden shadow-2xl transition-all duration-500 group-hover:shadow-[0_20px_40px_rgba(255,255,255,0.1)]" style={{ aspectRatio: '1/1' }}>
            {/* Subtle inner dark gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 z-10 opacity-0 group-hover:opacity-100 transition-opacity" />

            {artworks.length === 0 ? (
                <div className="w-full h-full bg-white/[0.02] flex items-center justify-center border border-white/5">
                    <Music size={40} className="text-white/10" />
                </div>
            ) : artworks.length === 1 ? (
                safeImageSrc(artworks[0]) ? (
                    <img src={safeImageSrc(artworks[0])!} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                ) : (
                    <div className="w-full h-full bg-white/[0.02] flex items-center justify-center border border-white/5">
                        <Music size={40} className="text-white/10" />
                    </div>
                )
            ) : (
                <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="overflow-hidden bg-white/5">
                            {safeImageSrc(artworks[i]) ? (
                                <img src={safeImageSrc(artworks[i])!} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full bg-white/[0.02]" />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="px-1">
            <h3 className="font-bold text-white/80 text-[15px] truncate group-hover:text-white transition-colors tracking-tight">{playlist.name}</h3>
            <p className="text-[11px] font-bold text-white/30 tracking-[0.1em] mt-1">{playlist.trackIds.length} {toSentenceCase('pistas')}</p>
        </div>
    </motion.div>
));

interface PlaylistsViewProps {
    onNavigate?: (view: string, params?: any) => void;
    initialPlaylistId?: string;
    openCreateModal?: boolean;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({ onNavigate, initialPlaylistId, openCreateModal }) => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [playlistArtworks, setPlaylistArtworks] = useState<Record<string, string[]>>({});
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
    const [recommendedTracks, setRecommendedTracks] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
    const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const { user } = useAuth();
    const userTier = (user?.tier as 'standard' | 'pro') || 'standard';

    const { playUnifiedCollection } = usePlayerStore(
        (state) => ({
            playUnifiedCollection: state.playUnifiedCollection,
        }),
        shallow
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Virtualization (Disabled for Reorder support, kept ref for list scrolling)

    useEffect(() => {
        const init = async () => {
            await loadPlaylists();
            await loadRecommendations();
            if (initialPlaylistId) {
                const allP = await getAllPlaylists();
                const target = allP.find(p => p.id === initialPlaylistId);
                if (target) handleSelectPlaylist(target);
            }
            if (openCreateModal) {
                setShowCreateModal(true);
            }
        };
        init();
    }, [initialPlaylistId, openCreateModal]);

    const loadRecommendations = async (seedTrack?: any) => {
        const tracks = await getAllTracks();
        if (seedTrack) {
            // Lógica simple: canciones del mismo artista o género como "relacionadas"
            const related = tracks.filter(t => 
                (t.artist === seedTrack.artist || t.genre === seedTrack.genre) && 
                t.id !== seedTrack.id
            );
            setRecommendedTracks(related.length > 5 ? related.slice(0, 15) : tracks.slice(0, 15));
        } else {
            setRecommendedTracks(tracks.slice(0, 15));
        }
    };
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length > 1) {
            setIsSearching(true);
            try {
                // Primero resultados locales (instantáneo)
                const localTracks = await getAllTracks();
                const localResults = localTracks.filter(t =>
                    t.title?.toLowerCase().includes(query.toLowerCase()) ||
                    t.artist?.toLowerCase().includes(query.toLowerCase())
                );
                if (localResults.length > 0) {
                    setSearchResults(localResults.slice(0, 20));
                }

                // Luego búsqueda global
                try {
                    const { MetadataEngine } = await import('@utils/MetadataEngine');
                    const searchResult = await MetadataEngine.search(query);
                    // searchUnified returns { tracks, artists, albums } — extract tracks array
                    const rawTracks = Array.isArray(searchResult)
                        ? searchResult
                        : (searchResult?.tracks || []);
                    const formatted = rawTracks.slice(0, 15).map((m: any) => ({
                        id: m.externalIds?.deezer || m.externalIds?.spotify || m.id || `ext-${Date.now()}-${Math.random()}`,
                        title: m.title || '',
                        artist: m.artist || '',
                        album: m.album || '',
                        artwork: typeof m.artwork === 'string' ? m.artwork : (m.artwork?.medium || m.artwork?.large || ''),
                        duration: m.duration || 0,
                        filePath: m.filePath || '',
                        format: 'Stream',
                        externalIds: m.externalIds,
                    }));

                    // Combinar sin duplicados
                    const combined = [...localResults];
                    formatted.forEach((gt: any) => {
                        if (!combined.some(lt => lt.id === gt.id || (lt.title === gt.title && lt.artist === gt.artist))) {
                            combined.push(gt);
                        }
                    });
                    setSearchResults(combined.slice(0, 20));
                } catch (globalErr) {
                    console.warn('[PlaylistSearch] Global search failed:', globalErr);
                    // Keep local results
                }
            } catch (e) {
                console.error('Search failed:', e);
            } finally {
                setTimeout(() => setIsSearching(false), 200);
            }
        } else {
            setIsSearching(false);
            setSearchResults([]);
        }
    };

    const handleChangeCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedPlaylist) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            const { updatePlaylist } = await import('@utils/database');
            await updatePlaylist(selectedPlaylist.id, { artwork: base64 });
            
            setSelectedPlaylist({ ...selectedPlaylist, artwork: base64 } as any);
            await syncPlaylistToBackend(selectedPlaylist.id);
            loadPlaylists();
            notificationService.success('Portada actualizada');
        };
        reader.readAsDataURL(file);
    };

    const syncPlaylistToBackend = async (playlistId: string) => {
        const token = localStorage.getItem('svzn_token') || localStorage.getItem('auth_access_token');
        if (!token || !user) return;
        const baseUrl = import.meta.env?.DEV ? '' : (import.meta.env?.VITE_BACKEND_URL || '');
        
        try {
            const allPlaylists = await getAllPlaylists();
            const pl = allPlaylists.find((p: any) => p.id === playlistId);
            if (!pl) return;
            
            const tracks = await getPlaylistTracks(playlistId);
            
            await fetch(`${baseUrl}/api/user/${user.id}/playlists`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...pl, tracks })
            });
        } catch (e) {
            console.error('Failed to sync playlist:', e);
        }
    };

    const loadPlaylists = async () => {
        let data = await getAllPlaylists();
        const { getAllTracks } = await import('@utils/database');
        const allTracks = await getAllTracks();
        const favoriteTracks = allTracks.filter(t => t.favorite);

        setPlaylists(data);
        // Pre-cargar artworks para portadas dinámicas
        const artworkMap: Record<string, string[]> = {};
        await Promise.all(data.map(async (pl: any) => {
            // If playlist has custom artwork, use that instead of track covers
            if (pl.artwork) {
                artworkMap[pl.id] = [pl.artwork];
                return;
            }
            
            const tracks = pl.id === 'favorites_v2' ? favoriteTracks : await getPlaylistTracks(pl.id);
            // artwork puede ser string o {medium, large} — extraer siempre la URL
            artworkMap[pl.id] = tracks
                .slice(0, 4)
                .map((t: any) => {
                    const art = t.artwork;
                    if (!art) return null;
                    if (typeof art === 'string') return art;
                    return art.medium || art.large || art.small || null;
                })
                .filter(Boolean) as string[];
        }));
        setPlaylistArtworks(artworkMap);
    };

    const handleCreate = async () => {
        if (!newPlaylistName.trim()) return;
        try {
            const id = await createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim() || undefined, newPlaylistIsPublic);
            setNewPlaylistName('');
            setNewPlaylistDesc('');
            setNewPlaylistIsPublic(false);
            setShowCreateModal(false);
            await syncPlaylistToBackend(id);
            loadPlaylists();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleSelectPlaylist = async (playlist: any) => {
        setSelectedPlaylist(playlist);
        const tracks = await getPlaylistTracks(playlist.id);
        setPlaylistTracks(tracks);
    };

    const handlePlayPlaylist = () => {
        if (playlistTracks.length === 0 || !selectedPlaylist) return;
        playUnifiedCollection(playlistTracks, 0, {
            type: 'playlist',
            id: selectedPlaylist.id,
            name: selectedPlaylist.name
        });
    };

    const handlePlayTrack = (_: any, index: number) => {
        if (playlistTracks.length === 0 || !selectedPlaylist) return;
        playUnifiedCollection(playlistTracks, index, {
            type: 'playlist',
            id: selectedPlaylist.id,
            name: selectedPlaylist.name
        });
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
                    {toSentenceCase('Mis playlists')}
                </button>

                {/* Hero Minimalist */}
                <div className="flex flex-col md:flex-row items-start md:items-end gap-10 p-4 md:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[120px] rounded-full pointer-events-none" />

                    <div className="relative group w-48 h-48 md:w-64 md:h-64 flex-shrink-0 rounded-[40px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/5">
                        {safeImageSrc(selectedPlaylist.artwork) ? (
                            <img src={safeImageSrc(selectedPlaylist.artwork)!} className="w-full h-full object-cover" alt="" />
                        ) : coverArts.length === 0 ? (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center"><Music size={60} className="text-white/15" /></div>
                        ) : coverArts.length === 1 ? (
                            safeImageSrc(coverArts[0]) ? (
                                <img src={safeImageSrc(coverArts[0])!} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full bg-white/5 flex items-center justify-center"><Music size={60} className="text-white/15" /></div>
                            )
                        ) : (
                            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="overflow-hidden bg-white/5">
                                        {safeImageSrc(coverArts[i]) ? (
                                            <img src={safeImageSrc(coverArts[i])!} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full bg-white/[0.03]" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <Plus size={32} className="text-white" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Cambiar Portada</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleChangeCover} accept="image/*" className="hidden" />
                    </div>

                    <div className="flex-1 pb-2 relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[8px] font-black uppercase tracking-widest text-white/40">
                                {selectedPlaylist.isVirtual ? 'Virtual' : 'Colección'}
                            </span>
                            <span className="text-[10px] font-bold text-white/20 tabular-nums">
                                {new Date(selectedPlaylist.createdDate).getFullYear()}
                            </span>
                        </div>
                        
                        <h1 className="text-6xl font-black text-white italic tracking-tighter mb-4 drop-shadow-2xl">
                            {selectedPlaylist.name}
                        </h1>

                        {selectedPlaylist.description && (
                            <p className="text-white/40 text-[11px] font-medium leading-relaxed mb-6 max-w-md italic">
                                "{selectedPlaylist.description}"
                            </p>
                        )}

                        <div className="flex items-center gap-3 flex-wrap">
                            {playlistTracks.length > 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                                    onClick={handlePlayPlaylist}
                                    className="flex items-center gap-3 px-8 py-3 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-tighter shadow-[0_15px_30px_rgba(255,255,255,0.2)]"
                                >
                                    <Play size={16} fill="currentColor" />
                                    Reproducir Todo
                                </motion.button>
                            )}
                            
                            <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => { 
                                    const recEl = document.getElementById('playlist-search-anchor');
                                    if (recEl) recEl.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="flex items-center gap-2 px-5 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
                            >
                                <Plus size={16} />
                                Añadir Música
                            </motion.button>

                            {!selectedPlaylist.isVirtual && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={async () => {
                                        const nextState = !selectedPlaylist.isPublic;
                                        await togglePlaylistPrivacy(selectedPlaylist.id, nextState);
                                        setSelectedPlaylist({ ...selectedPlaylist, isPublic: nextState });
                                        loadPlaylists();
                                    }}
                                    className={clsx(
                                        "flex items-center gap-2 px-5 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        selectedPlaylist.isPublic 
                                            ? "bg-primary/10 border-primary/20 text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]" 
                                            : "bg-white/5 border-white/10 text-white/20 hover:text-white"
                                    )}
                                >
                                    {selectedPlaylist.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                                    {selectedPlaylist.isPublic ? 'Pública' : 'Privada'}
                                </motion.button>
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className="max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar"
                >
                    {playlistTracks.length === 0 ? (
                        <div className="py-16 text-center">
                            <Music size={32} className="mx-auto mb-3 text-white/15" />
                            <p className="text-white/30 text-sm">{toSentenceCase('Esta playlist está vacía')}</p>
                            <p className="text-white/15 text-xs mt-1">{toSentenceCase('Busca canciones y añádelas con el botón +')}</p>
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
                                    key={`${track.id}-${index}`}
                                    value={track}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative"
                                >
                                    <div
                                        onClick={() => handlePlayTrack(track, index)}
                                        className="flex items-center gap-4 py-3 px-2 rounded-2xl border border-transparent hover:bg-white/[0.02] active:bg-white/[0.04] cursor-pointer group transition-all"
                                    >
                                        <div className="flex items-center gap-2 w-10 justify-center">
                                            <div className="cursor-grab active:cursor-grabbing text-white/10 group-hover:text-white/40 transition-colors">
                                                <GripVertical size={14} />
                                            </div>
                                            <span className="text-white/20 text-[10px] font-mono group-hover:text-white/50 transition-colors">{index + 1}</span>
                                        </div>

                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/5 relative">
                                            {safeImageSrc(track.artwork) ? (
                                                <img src={safeImageSrc(track.artwork)!} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
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
                                                await syncPlaylistToBackend(selectedPlaylist.id);
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

                    {/* Buscador de canciones */}
                    {/* Buscador de canciones premium */}
                    <div id="playlist-search-anchor" className="mt-12 mb-8 p-8 rounded-[40px] bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="relative z-10">
                            <h3 className="text-xl font-black text-white italic tracking-tighter mb-2">Añade magia a tu lista</h3>
                            <p className="text-white/30 text-[11px] font-medium mb-6">Busca en el catálogo global de SoundVizion</p>
                            
                            <div className="relative max-w-md">
                                <Search className={clsx("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", isSearching ? 'text-primary' : 'text-white/20')} size={18} />
                                <input 
                                    type="text"
                                    placeholder="Canción, artista o álbum..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-[13px] font-bold text-white placeholder:text-white/20 focus:outline-none focus:bg-white/[0.08] focus:border-white/20 transition-all shadow-2xl"
                                />
                                {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-white/20" size={16} />}
                            </div>
                        </div>
                    </div>

                    {/* Resultados de Búsqueda o Recomendaciones */}
                    {searchResults.length > 0 ? (
                        <div className="mb-12 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <h3 className="text-xs font-bold text-white/30 mb-6 uppercase tracking-widest px-2">Resultados de la búsqueda</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {searchResults.map((track, idx) => (
                                    <div key={`${track.id}-${idx}`} className="flex items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-white/[0.04] group transition-all border border-transparent hover:border-white/5">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden shrink-0 border border-white/5">
                                            {safeImageSrc(track.artwork) ? <img src={safeImageSrc(track.artwork)!} className="w-full h-full object-cover"/> : <Disc size={16} className="m-3 text-white/10" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white/80 group-hover:text-white truncate transition-colors">{track.title}</p>
                                            <p className="text-[11px] text-white/30 truncate">{track.artist}</p>
                                        </div>
                                        <button 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await addTrackToPlaylist(selectedPlaylist.id, track.id);
                                                await handleSelectPlaylist(selectedPlaylist);
                                                loadRecommendations(track);
                                                await syncPlaylistToBackend(selectedPlaylist.id);
                                                setSearchQuery('');
                                                notificationService.success('Añadida');
                                            }}
                                            className="h-8 px-4 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            Añadir
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-8 pb-20">
                            <h3 className="text-xs font-bold text-white/30 mb-6 uppercase tracking-widest px-2">Sugerencias basadas en esta lista</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                                {recommendedTracks.filter(t => !playlistTracks.some(pt => pt.id === t.id)).map((track, i) => (
                                    <div key={track.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.02] group transition-all">
                                        <div className="w-9 h-9 rounded bg-[#111] overflow-hidden shrink-0 border border-white/5">
                                            {safeImageSrc(track.artwork) ? <img src={safeImageSrc(track.artwork)!} className="w-full h-full object-cover"/> : <Disc size={14} className="m-2.5 text-white/20" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white/80 group-hover:text-white truncate transition-colors">{track.title}</p>
                                            <p className="text-[11px] text-white/40 truncate">{track.artist}</p>
                                        </div>
                                        <button 
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await addTrackToPlaylist(selectedPlaylist.id, track.id);
                                                await handleSelectPlaylist(selectedPlaylist);
                                                loadRecommendations(track);
                                                await syncPlaylistToBackend(selectedPlaylist.id);
                                                notificationService.success('Añadida');
                                            }}
                                            className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─── Playlist Grid View ─────────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2">{toSentenceCase('Mis playlists')}</h1>
                    <p className="text-white/30 text-[10px] font-bold tracking-[0.1em]">{playlistArtworks ? Object.keys(playlistArtworks).length : 0} {toSentenceCase('colecciones')}</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold text-xs tracking-tight shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                    <Plus size={16} strokeWidth={3} />
                    {toSentenceCase('Crear lista')}
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
                            className="bg-[#050505] border border-white/10 rounded-3xl p-7 w-full max-w-sm shadow-2xl"
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
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 mb-4 h-20 resize-none transition-all"
                            />
                            
                            <div className="flex items-center justify-between px-2 mb-6">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white">Privacidad</span>
                                    <span className="text-[10px] text-white/30 italic">Visible en tu perfil si es pública</span>
                                </div>
                                <button 
                                    onClick={() => setNewPlaylistIsPublic(!newPlaylistIsPublic)}
                                    className={clsx(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                        newPlaylistIsPublic ? "bg-sky-500 text-white" : "bg-white/5 text-white/40 border border-white/10"
                                    )}
                                >
                                    {newPlaylistIsPublic ? <Globe size={12} /> : <Lock size={12} />}
                                    {newPlaylistIsPublic ? 'Pública' : 'Privada'}
                                </button>
                            </div>
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
