import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MetadataEngine } from '../../utils/MetadataEngine';
import { usePlayerStore } from '../../store/player';
import { Play, ChevronLeft, Share2, Heart, ChevronRight } from 'lucide-react';

interface ArtistProfileProps {
    artistId?: string;
    artistName: string;
    onBack: () => void;
    onNavigate?: (view: string, params: any) => void;
}

export const ArtistProfile: React.FC<ArtistProfileProps> = ({ artistId, artistName, onBack, onNavigate }) => {
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { playUnifiedCollection } = usePlayerStore();

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const data = await MetadataEngine.getArtistFullProfile(artistName, artistId);
                setProfile(data);
            } catch (err) {
                console.error('Failed to fetch artist profile:', err);
            }
            setIsLoading(false);
        };
        fetchProfile();
    }, [artistName, artistId]);

    const handlePlayTopTrack = async (index: number) => {
        await playUnifiedCollection(profile?.topTracks || [], index);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section */}
            <div className="relative h-[400px] -mt-8 -mx-8 group overflow-hidden">
                <img
                    src={profile.image || 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1200'}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={profile.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="absolute top-12 left-12 z-20">
                    <button
                        onClick={onBack}
                        className="p-3 bg-black/40 backdrop-blur-md rounded-2xl text-white/60 hover:text-white hover:bg-white/10 border border-white/10 transition-all uppercase tracking-widest text-[10px] font-black flex items-center gap-2"
                    >
                        <ChevronLeft size={16} /> Volver
                    </button>
                </div>

                <div className="absolute bottom-12 left-12 right-12 z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full">Artista Verificado</span>
                    </div>
                    <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter italic uppercase truncate mb-6">
                        {profile.name}
                    </h1>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-white font-black text-2xl">{profile.listeners?.toLocaleString()}</span>
                            <span className="text-white/40 text-[10px] uppercase font-black tracking-widest">Oyentes mensuales</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 px-4">
                <motion.button
                    whileHover={{ scale: 1.05, shadow: "0 0 30px rgba(255,255,255,0.2)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => profile.topTracks?.length > 0 && handlePlayTopTrack(0)}
                    className="h-16 px-10 bg-white text-black rounded-full font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl"
                >
                    <Play fill="black" size={24} /> Reproducir
                </motion.button>
                <div className="flex items-center gap-4">
                    <button className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all border border-white/5">
                        <Heart size={24} />
                    </button>
                    <button className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all border border-white/5">
                        <Share2 size={24} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 px-4">
                {/* Top Tracks */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-black uppercase tracking-widest text-white italic">Populares</h3>
                    <div className="space-y-1">
                        {profile.topTracks.slice(0, 5).map((track: any, index: number) => (
                            <motion.div
                                key={index}
                                onClick={() => handlePlayTopTrack(index)}
                                className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.05] cursor-pointer transition-all border border-transparent hover:border-white/5"
                            >
                                <span className="w-8 text-white/20 font-mono text-center group-hover:text-white transition-colors">{index + 1}</span>
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                                    <img src={track.artwork.small} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <h4 className="text-white font-bold truncate tracking-tight">{track.title}</h4>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{track.album}</p>
                                </div>
                                <span className="text-white/20 font-mono text-xs pr-4">{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Discography Preview */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black uppercase tracking-widest text-white italic">Discografía</h3>
                        <button className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">Ver todo</button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {profile.albums.slice(0, 6).map((album: any) => (
                            <motion.div
                                key={album.id}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => {
                                    onNavigate?.('album', {
                                        albumName: album.title,
                                        artistName: artistName,
                                        albumId: album.id,
                                        from: 'artist'
                                    });
                                }}
                                className="group flex items-center gap-4 bg-white/5 p-3 rounded-2xl cursor-pointer border border-white/5 hover:border-white/10 transition-all"
                            >
                                <div className="w-16 h-16 rounded-xl overflow-hidden shadow-xl flex-shrink-0">
                                    <img src={album.image || profile.image} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-white font-bold truncate text-sm">{album.title}</h4>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{album.year} • {album.type}</p>
                                </div>
                                <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-black ml-auto">
                                    <ChevronRight size={20} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Biography Section */}
            {profile.bio && (
                <div className="px-4 py-12 bg-white/[0.02] rounded-[40px] border border-white/5 mx-4">
                    <h3 className="text-xl font-black uppercase tracking-widest text-white italic mb-6">Sobre el artista</h3>
                    <div
                        className="text-white/60 leading-relaxed font-medium columns-1 md:columns-2 gap-12"
                        dangerouslySetInnerHTML={{ __html: profile.bio }}
                    />
                </div>
            )}

            {/* Related Artists */}
            <div className="px-4 pb-20">
                <h3 className="text-xl font-black uppercase tracking-widest text-white italic mb-6">Fans también escuchan</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {profile.related.slice(0, 6).map((artist: any) => (
                        <motion.div
                            key={artist.id}
                            whileHover={{ y: -5 }}
                            onClick={() => onNavigate?.('artist', { artistId: artist.id, artistName: artist.name, from: 'artist' })}
                            className="group flex flex-col items-center gap-4 text-center cursor-pointer"
                        >
                            <div className="w-full aspect-square rounded-full overflow-hidden shadow-2xl border-4 border-white/5 group-hover:border-white/20 transition-all">
                                <img src={artist.image || profile.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={artist.name} />
                            </div>
                            <span className="text-white font-bold text-sm tracking-tight">{artist.name}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
