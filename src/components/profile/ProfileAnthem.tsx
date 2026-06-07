import React, { useState, useEffect } from 'react';
import { Play, Search, Disc, Edit3 } from 'lucide-react';
import { getAllTracks, getProfile } from '../../utils/database';
import { Track } from '../../types';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '@store/auth';

export const ProfileAnthem: React.FC<{ isForeign?: boolean, userId?: string }> = ({ isForeign, userId }) => {
    const [anthemTarget, setAnthemTarget] = useState<Track | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [library, setLibrary] = useState<Track[]>([]);
    const { updateProfile: syncProfile, user } = useAuth();
    
    useEffect(() => {
        const loadAnthem = async () => {
            if (isForeign && userId) {
                try {
                    const token = localStorage.getItem('svzn_token') || localStorage.getItem('auth_access_token');
                    const baseUrl = (import.meta as any).env?.VITE_BACKEND_URL || '';
                    const res = await fetch(`${baseUrl}/api/user/${userId}/anthem`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data?.anthem) {
                            setAnthemTarget(data.anthem);
                        } else {
                            setAnthemTarget(null);
                        }
                    } else {
                        setAnthemTarget(null);
                    }
                } catch {
                    setAnthemTarget(null);
                }
            } else {
                // 1. Try auth store first (most up-to-date)
                if ((user as any)?.anthem) {
                    setAnthemTarget((user as any).anthem);
                    if (!isForeign) {
                        const tracks = await getAllTracks();
                        setLibrary(tracks.filter(t => t.format === 'LOCAL' || t.filePath));
                    }
                    return;
                }
                // 2. Try localStorage cache
                const cacheKey = user ? `svzn_anthem_${(user as any).email || (user as any).id}` : 'svzn_anthem';
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try { setAnthemTarget(JSON.parse(cached)); } catch {}
                    if (!isForeign) {
                        const tracks = await getAllTracks();
                        setLibrary(tracks.filter(t => t.format === 'LOCAL' || t.filePath));
                    }
                    return;
                }
                // 3. Fallback to local DB
                const data = await getProfile();
                if (data?.anthem) setAnthemTarget(data.anthem);
                
                if (!isForeign) {
                    const tracks = await getAllTracks();
                    setLibrary(tracks.filter(t => t.format === 'LOCAL' || t.filePath));
                }
            }
        };
        loadAnthem();
    }, [isForeign, userId, user]);

    const saveAnthem = async (track: Track) => {
        try {
            // Save to localStorage immediately for persistence across reloads
            const cacheKey = user ? `svzn_anthem_${(user as any).email || (user as any).id}` : 'svzn_anthem';
            localStorage.setItem(cacheKey, JSON.stringify(track));
            setAnthemTarget(track);
            setIsSearching(false);
            // Save to backend
            await syncProfile({ anthem: track } as any);
            notificationService.success('Canción actualizada');
        } catch (e) {
            notificationService.error('Error al guardar canción');
        }
    };

    return (
        <div className="relative w-full sm:w-[400px] bg-[#050505] border border-white/5 rounded-xl overflow-hidden group/card shadow-xl">
            {/* ── Subtle Twinkling Stars ── */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes twinkle {
                    0%, 100% { opacity: 0.1; transform: scale(0.8); }
                    50% { opacity: 0.8; transform: scale(1.2); box-shadow: 0 0 4px rgba(255,255,255,0.8); }
                }
                .mini-star {
                    position: absolute;
                    width: 2px; height: 2px;
                    background: white;
                    border-radius: 50%;
                    animation: twinkle 4s ease-in-out infinite;
                }
            `}} />
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="mini-star" style={{ top: '20%', left: '15%', animationDelay: '0s' }} />
                <div className="mini-star" style={{ top: '60%', left: '80%', animationDelay: '1.5s' }} />
                <div className="mini-star" style={{ top: '80%', left: '25%', animationDelay: '3s' }} />
                <div className="mini-star" style={{ top: '30%', left: '60%', animationDelay: '2s' }} />
                <div className="mini-star" style={{ top: '10%', left: '90%', animationDelay: '0.5s' }} />
            </div>

            {/* Subtle glow layer */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none z-0 opacity-50" />

            {/* Content Layer */}
            <div className="relative z-10 bg-black/40 backdrop-blur-[2px]">
                {isSearching ? (
                    <div className="p-4 flex flex-col gap-3 backdrop-blur-md bg-black/60">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar en tu librería..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-[#111] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-white/30 transition-colors"
                            />
                        </div>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                            {library
                                .filter(t =>
                                    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    (t.artist && t.artist.toLowerCase().includes(searchQuery.toLowerCase()))
                                )
                                .slice(0, 10)
                                .map(track => (
                                    <button
                                        key={track.id}
                                        onClick={() => saveAnthem(track)}
                                        className="flex items-center gap-3 p-2 rounded-md hover:bg-white/[0.04] transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded bg-[#1a1a1a] shrink-0 overflow-hidden">
                                            {track.artwork
                                                ? <img src={track.artwork} className="w-full h-full object-cover" />
                                                : <Disc className="w-full h-full p-1.5 text-white/20" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-white truncate">{track.title}</p>
                                            <p className="text-[10px] text-white/40 truncate">{track.artist}</p>
                                        </div>
                                    </button>
                                ))}
                        </div>
                        <button
                            onClick={() => setIsSearching(false)}
                            className="text-xs text-white/40 hover:text-white transition-colors py-1"
                        >
                            Cancelar
                        </button>
                    </div>
                ) : anthemTarget ? (
                    <div className="flex items-center p-3 gap-4 group">
                        <div className="relative shrink-0 cursor-pointer">
                            <div className="w-14 h-14 rounded-md overflow-hidden bg-[#111] border border-white/5 shadow-md">
                                {anthemTarget.artwork
                                    ? <img src={anthemTarget.artwork} className="w-full h-full object-cover" alt="cover" />
                                    : <Disc size={20} className="w-full h-full p-3 text-white/20" />}
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Play size={16} fill="currentColor" className="text-white ml-0.5" />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0 cursor-pointer">
                            <p className="text-sm font-semibold text-white/90 truncate">{anthemTarget.title}</p>
                            <p className="text-xs text-primary/80 truncate mt-0.5 uppercase tracking-widest">{anthemTarget.artist}</p>
                        </div>

                        {!isForeign && (
                            <button
                                onClick={() => setIsSearching(true)}
                                className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-full transition-colors shrink-0"
                                title="Cambiar canción"
                            >
                                <Edit3 size={16} />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-4 p-3">
                        <div className="w-14 h-14 rounded-md bg-[#111] border border-white/5 flex items-center justify-center shrink-0">
                            <Disc size={20} className="text-white/20" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-white/40">Sin canción destacada</p>
                        </div>
                        {!isForeign && (
                            <button
                                onClick={() => setIsSearching(true)}
                                className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/80 text-xs font-semibold hover:text-white hover:bg-white/10 transition-colors"
                            >
                                Añadir
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
