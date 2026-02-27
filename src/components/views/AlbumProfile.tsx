import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MetadataEngine } from '../../utils/MetadataEngine';
import { usePlayerStore } from '../../store/player';
import { Play, Clock, ChevronLeft, Music2, Heart } from 'lucide-react';
import { UnifiedTrackMetadata } from '../../types';

interface AlbumProfileProps {
    albumId?: string;
    albumName: string;
    artistName?: string;
    onBack?: () => void;
    onNavigate?: (view: string, params: any) => void;
}

export const AlbumProfile: React.FC<AlbumProfileProps> = ({ albumId, albumName, artistName, onBack, onNavigate }) => {
    const [tracks, setTracks] = useState<UnifiedTrackMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [albumInfo, setAlbumInfo] = useState<any>(null);
    const { playUnifiedCollection } = usePlayerStore();

    useEffect(() => {
        const fetchAlbumData = async () => {
            setIsLoading(true);
            try {
                if (albumId) {
                    // Fetch tracks directly using ID
                    const tracksData = await MetadataEngine.getAlbumTracks(albumId);
                    setTracks(tracksData);
                    const info = await MetadataEngine.getAlbumInfo(albumId);
                    if (info) setAlbumInfo(info);
                    else setAlbumInfo({ title: albumName, artist: artistName });
                } else {
                    // Fallback to name search
                    const spotifySearch = await MetadataEngine.search(albumName + (artistName ? ` ${artistName}` : ''));
                    const album = spotifySearch.albums?.find((a: any) =>
                        a.name.toLowerCase().includes(albumName.toLowerCase())
                    );

                    if (album) {
                        setAlbumInfo(album);
                        const tracksData = await MetadataEngine.getAlbumTracks(album.id);
                        setTracks(tracksData);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch album tracks:', err);
            }
            setIsLoading(false);
        };
        fetchAlbumData();
    }, [albumName, artistName, albumId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="relative h-80 -mt-8 -mx-8 group overflow-hidden">
                <img
                    src={albumInfo?.thumbnail || albumInfo?.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1200'}
                    className="w-full h-full object-cover blur-md opacity-30 scale-110"
                    alt=""
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                <div className="absolute top-12 left-12 z-20">
                    <button
                        onClick={onBack}
                        className="p-3 bg-black/40 backdrop-blur-md rounded-2xl text-white/60 hover:text-white hover:bg-white/10 border border-white/10 transition-all uppercase tracking-widest text-[10px] font-black flex items-center gap-2"
                    >
                        <ChevronLeft size={16} /> Volver
                    </button>
                </div>

                <div className="absolute bottom-12 left-12 right-12 z-10 flex items-end gap-8">
                    <div className="w-48 h-48 rounded-[24px] overflow-hidden shadow-2xl border border-white/10 flex-shrink-0">
                        <img
                            src={albumInfo?.thumbnail || albumInfo?.image}
                            className="w-full h-full object-cover"
                            alt={albumName}
                        />
                    </div>
                    <div className="pb-2">
                        <p className="text-white/40 text-[10px] font-black tracking-[0.4em] uppercase mb-2">Ãlbum</p>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter italic uppercase truncate max-w-2xl mb-4">
                            {albumName}
                        </h1>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    const name = artistName || albumInfo?.artist;
                                    if (!name) return;
                                    onNavigate?.('artist', { artistName: name, from: 'search' });
                                }}
                                className="text-white font-bold text-lg hover:text-primary transition-colors"
                            >
                                {artistName || albumInfo?.artist}
                            </button>
                            <span className="text-white/20">•</span>
                            <span className="text-white/40 font-mono text-sm">{tracks.length} canciones</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 px-4">
                <motion.button
                    whileHover={{ scale: 1.05, shadow: "0 0 30px rgba(255,255,255,0.2)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => tracks.length > 0 && playUnifiedCollection(tracks, 0, { type: 'album', id: albumId || albumName, name: albumName })}
                    className="h-16 px-10 bg-white text-black rounded-full font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl"
                >
                    <Play fill="black" size={24} /> Escuchar
                </motion.button>

                <button
                    onClick={() => {
                        const artist = artistName || albumInfo?.artist;
                        if (artist) {
                            import('../../utils/database').then(db => {
                                db.toggleLikeArtist({ name: artist });
                            });
                        }
                    }}
                    className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/5"
                >
                    <Heart size={24} />
                </button>
            </div>

            {/* Tracklist */}
            <div className="px-4 pb-20">
                <div className="grid grid-cols-[40px_52px_1fr_100px_60px] gap-4 px-4 py-2 text-white/20 text-[10px] font-black uppercase tracking-widest border-b border-white/5 mb-4">
                    <span>#</span>
                    <span></span>
                    <span>Título</span>
                    <span className="text-right"><Clock size={14} className="ml-auto" /></span>
                    <span></span>
                </div>

                <div className="space-y-1">
                    {tracks.map((track, index) => (
                        <motion.div
                            key={index}
                            onClick={() => playUnifiedCollection(tracks, index, { type: 'album', id: albumId || albumName, name: albumName })}
                            className="group grid grid-cols-[40px_52px_1fr_100px_60px] gap-4 px-4 py-3 rounded-2xl hover:bg-white/[0.05] cursor-pointer transition-all items-center border border-transparent hover:border-white/5"
                        >
                            <span className="text-white/20 font-mono group-hover:text-white transition-colors">{index + 1}</span>
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                                <img
                                    src={track.artwork?.small || track.artwork?.medium || albumInfo?.thumbnail || albumInfo?.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300'}
                                    className="w-full h-full object-cover"
                                    alt={track.title}
                                />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-white font-bold truncate tracking-tight">{track.title}</h4>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{track.artist}</p>
                            </div>
                            <span className="text-right text-white/20 font-mono text-xs">
                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                            </span>
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        usePlayerStore.getState().toggleFavorite(track);
                                    }}
                                    className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${(track as any).favorite ? "text-primary" : "text-white/40"}`}
                                >
                                    <Heart size={16} fill={(track as any).favorite ? "currentColor" : "none"} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                    {tracks.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-4">
                            <Music2 size={40} className="text-white/10" />
                            <p className="text-white/40 font-black uppercase tracking-widest text-xs">No se encontraron pistas para este álbum</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

