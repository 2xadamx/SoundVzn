import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LogOut, Crown, Camera, Plus, Disc, Music,
    Heart, UserPlus, X, ArrowLeft,
    Search, UserCheck, Users, Share2, Link, Check,
    Headphones, Radio, BarChart3, Edit3
} from 'lucide-react';
import { updateProfile as dbUpdateProfile, getAllTracks, getAllPlaylists } from '@utils/database';
import { socialService } from '../../utils/socialService';
import { useAuth } from '@store/auth';
import { usePlayerStore } from '@store/player';
import { ProfileAnthem } from '../profile/ProfileAnthem';
import { safeImageSrc } from '@utils/imageUrl';
import clsx from 'clsx';

// ─── Connections Modal ────────────────────────────────────────────────────────
const ConnectionsModal: React.FC<{
    initialTab: 'followers' | 'following' | 'friends';
    connections: { following: any[]; followers: any[]; friends: any[] };
    onClose: () => void;
    onNavigate: (userId: string) => void;
}> = ({ initialTab, connections, onClose, onNavigate }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [search, setSearch] = useState('');
    const currentList = connections[activeTab] || [];
    const filtered = currentList.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase())
    );
    const tabs = [
        { id: 'following' as const, label: 'Siguiendo', count: connections.following.length },
        { id: 'followers' as const, label: 'Seguidores', count: connections.followers.length },
        { id: 'friends'   as const, label: 'Amigos',     count: connections.friends.length },
    ];
    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full sm:w-[520px] max-h-[85vh] bg-[#0c0c0e] border border-white/10 rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Handle bar (mobile) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>
                {/* Tabs */}
                <div className="flex items-center border-b border-white/[0.06] px-2 pt-2 sm:pt-4">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={clsx('flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-all border-b-2',
                                activeTab === t.id ? 'text-white border-white' : 'text-white/30 border-transparent hover:text-white/60'
                            )}>
                            {t.label} <span className="ml-1 opacity-50">{t.count}</span>
                        </button>
                    ))}
                    <button onClick={onClose} className="p-2 ml-2 text-white/30 hover:text-white shrink-0">
                        <X size={18} />
                    </button>
                </div>
                {/* Search */}
                <div className="px-4 py-3 border-b border-white/[0.04]">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors" />
                    </div>
                </div>
                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 opacity-30">
                            <Users size={32} className="mb-3" />
                            <p className="text-sm font-medium">Sin resultados</p>
                        </div>
                    ) : filtered.map(u => (
                        <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group">
                            <button onClick={() => { onNavigate(u.id); onClose(); }}
                                className="w-11 h-11 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                                <img src={u.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${u.id}`}
                                    className="w-full h-full object-cover" alt="" />
                            </button>
                            <button onClick={() => { onNavigate(u.id); onClose(); }} className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-semibold text-white/90 truncate">{u.name}</p>
                                <p className="text-[11px] text-white/30 truncate">@{u.username || 'user'}</p>
                            </button>
                            <button onClick={async () => {
                                if (activeTab !== 'followers') {
                                    if (confirm(`¿Dejar de seguir a ${u.name}?`)) {
                                        await socialService.removeFriend(u.id);
                                        window.dispatchEvent(new CustomEvent('svzn_friends_updated'));
                                    }
                                } else {
                                    await socialService.sendFriendRequest(u.id);
                                }
                            }} className={clsx('px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0',
                                activeTab === 'followers'
                                    ? 'bg-white text-black border-white hover:bg-white/90'
                                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                            )}>
                                {activeTab === 'followers' ? 'Seguir' : activeTab === 'following' ? 'Siguiendo' : 'Amigo'}
                            </button>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

// ─── Stat Pill ────────────────────────────────────────────────────────────────
const StatPill: React.FC<{ value: number; label: string; onClick?: () => void }> = ({ value, label, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 group px-3 py-1 rounded-xl hover:bg-white/5 transition-colors">
        <span className="text-lg font-black text-white group-hover:text-primary transition-colors leading-none">{value}</span>
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{label}</span>
    </button>
);

// ─── Playlist Mosaic ──────────────────────────────────────────────────────────
const extractArtworkUrl = (art: any): string | null => {
    if (!art) return null;
    if (typeof art === 'string') return art;
    return art.medium || art.large || art.small || null;
};

const PlaylistMosaic: React.FC<{ pl: any }> = ({ pl }) => {
    const mainCover = extractArtworkUrl(pl.artwork || pl.cover_url || pl.cover);
    const rawCovers = pl.artwork
        ? [pl.artwork]
        : (pl.mosaicCovers || [pl.artwork, pl.cover2, pl.cover3, pl.cover4]);
    const covers = rawCovers.map(extractArtworkUrl).filter(Boolean) as string[];

    if (covers.length >= 4 && !mainCover) return (
        <div className="w-full aspect-square grid grid-cols-2 gap-[2px] overflow-hidden rounded-2xl border border-white/5 group-hover:border-white/15 transition-all shadow-lg">
            {covers.slice(0, 4).map((c: string, i: number) => (
                <img key={i} src={c} className="w-full h-full object-cover" />
            ))}
        </div>
    );
    return (
        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[#111] border border-white/5 group-hover:border-white/15 transition-all shadow-lg flex items-center justify-center">
            {mainCover
                ? <img src={mainCover} className="w-full h-full object-cover" />
                : <Music size={24} className="text-white/10" />
            }
        </div>
    );
};

// ─── Main ProfileView ─────────────────────────────────────────────────────────
export const ProfileView: React.FC<{ userId?: string }> = ({ userId: propUserId }) => {
    const { user, updateProfile: updateProfileStore, logout } = useAuth();

    const [profile, setProfile]     = useState<any>(null);
    const [bio, setBio]             = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData]   = useState<any>({});
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [activeSection, setActiveSection] = useState<'music' | 'playlists' | 'stats'>('music');
    const [stats, setStats]         = useState({ following: 0, followers: 0, friends: 0, publicPlaylists: 0 });
    const [connections, setConnections] = useState<{ following: any[]; followers: any[]; friends: any[] }>({ following: [], followers: [], friends: [] });
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [recentFavorites, setRecentFavorites] = useState<any[]>([]);
    const [requestSent, setRequestSent] = useState(false);
    const [isFriend, setIsFriend]   = useState(false);
    const [modal, setModal]         = useState<'followers' | 'following' | 'friends' | null>(null);
    const [copied, setCopied]       = useState(false);

    const fileInputRef   = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    const targetUserId     = propUserId;
    const isForeignProfile = !!targetUserId && targetUserId !== user?.id;

    const loadProfile = useCallback(async () => {
        let data: any;
        const token   = localStorage.getItem('svzn_token') || localStorage.getItem('auth_access_token');
        const baseUrl = (import.meta as any).env?.DEV ? '' : ((import.meta as any).env?.VITE_BACKEND_URL || '');

        if (isForeignProfile) {
            try {
                const res = await fetch(`${baseUrl}/api/user/${targetUserId}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'X-SoundVzn-Identity': 'SVZN-CORE-AUTH' }
                });
                if (res.ok) {
                    data = await res.json();
                } else {
                    // Try social search as fallback
                    const found = await socialService.searchUsers(targetUserId as string);
                    data = found.find((u: any) => u.id === targetUserId) || null;
                }
            } catch {
                try {
                    const found = await socialService.searchUsers(targetUserId as string);
                    data = found.find((u: any) => u.id === targetUserId) || null;
                } catch {
                    data = null;
                }
            }
            // If still no data, show a placeholder so we don't show own profile
            if (!data) {
                data = {
                    id: targetUserId,
                    name: 'Usuario',
                    username: 'user',
                    avatar: null,
                    banner: null,
                    bio: '',
                    tier: 'standard',
                    svzn_id: 0,
                };
            }
        } else {
            const bannerKey = user ? `svzn_banner_${(user as any).email || user.id}` : 'svzn_banner';
            data = user ? { ...user, bio: user.bio || '', banner: (user as any).banner || localStorage.getItem(bannerKey) || '' } : null;
        }

        if (data) { setProfile(data); setEditData(data); setBio(data.bio || ''); }

        try {
            if (isForeignProfile) {
                const [fr, pr] = await Promise.all([
                    fetch(`${baseUrl}/api/user/${targetUserId}/friends`,  { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${baseUrl}/api/user/${targetUserId}/playlists`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                const [fd, pd] = await Promise.all([fr.ok ? fr.json() : [], pr.ok ? pr.json() : []]);
                setConnections({ following: fd, followers: fd, friends: fd });
                setPlaylists(pd);
                setStats({ following: fd.length, followers: fd.length, friends: fd.length, publicPlaylists: pd.length });
            } else {
                const localPlaylists = await getAllPlaylists();
                const { getPlaylistTracks: localGetTracks } = await import('@utils/database');
                const enriched = await Promise.all(localPlaylists.map(async (p: any) => {
                    const tracks = await localGetTracks(p.id);
                    const mosaicCovers = tracks
                        .slice(0, 4)
                        .map((t: any) => {
                            const art = t.artwork;
                            if (!art) return null;
                            if (typeof art === 'string') return art;
                            return art.medium || art.large || art.small || null;
                        })
                        .filter(Boolean);
                    return { ...p, mosaicCovers };
                }));
                setPlaylists(enriched);
                try {
                    const fr = await fetch(`${baseUrl}/api/user/${user?.id}/friends`, { headers: { 'Authorization': `Bearer ${token}` } });
                    const fd = fr.ok ? await fr.json() : [];
                    setConnections({ following: fd, followers: fd, friends: fd });
                    setStats({ following: fd.length, followers: fd.length, friends: fd.length, publicPlaylists: enriched.length });
                } catch {
                    setStats({ following: 0, followers: 0, friends: 0, publicPlaylists: enriched.length });
                }
            }
        } catch {}

        if (isForeignProfile && user?.id) {
            try {
                const myFriendsRes = await fetch(`${baseUrl}/api/user/${user.id}/friends`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (myFriendsRes.ok) {
                    const myFriends = await myFriendsRes.json();
                    setIsFriend(myFriends.some((f: any) => f.id === targetUserId));
                }
            } catch {}
        }

        if (!isForeignProfile) {
            try {
                const tracks = await getAllTracks();
                // Deduplicar por ID antes de filtrar favoritos
                const seen = new Set<string>();
                const unique = tracks.filter(t => {
                    if (seen.has(t.id)) return false;
                    seen.add(t.id);
                    return true;
                });
                setRecentFavorites(unique.filter(t => t.favorite).slice(0, 8));
            } catch {}
        } else {
            // Foreign profile — don't show own favorites
            setRecentFavorites([]);
        }
    }, [isForeignProfile, targetUserId, user]);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    const handleSave = async () => {
        const success = await updateProfileStore({ 
            name: editData.name, 
            avatar: editData.avatar, 
            bio,
            banner: editData.banner as any,
        } as any);
        if (success) {
            if ((window as any).electron) await dbUpdateProfile({ bio });
            // Persist banner locally too
            if (editData.banner) {
                const stored = localStorage.getItem('svzn_user');
                if (stored) {
                    try {
                        const u = JSON.parse(stored);
                        localStorage.setItem('svzn_user', JSON.stringify({ ...u, banner: editData.banner }));
                        const bannerKey = `svzn_banner_${u.email || u.id}`;
                        localStorage.setItem(bannerKey, editData.banner);
                    } catch {}
                }
            }
            setIsEditing(false);
            window.dispatchEvent(new CustomEvent('profile-updated'));
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        const r = new FileReader();
        r.onloadend = () => setEditData({ ...editData, avatar: r.result });
        r.readAsDataURL(f);
    };

    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        const r = new FileReader();
        r.onloadend = () => setEditData({ ...editData, banner: r.result });
        r.readAsDataURL(f);
    };

    const navigate = (userId: string) =>
        window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'profile', params: { userId } } }));

    const navigateToPlaylist = (playlistId: string) =>
        window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'playlist', params: { playlistId } } }));

    const goBack = () =>
        window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'friends' } }));

    const sendRequest = async () => {
        if (isFriend) {
            try {
                await socialService.removeFriend(targetUserId!);
                setIsFriend(false);
                usePlayerStore.getState().addToast({ type: 'success', message: 'Dejaste de seguir a este usuario', duration: 3000 });
            } catch {}
            return;
        }
        try {
            await socialService.sendFriendRequest(targetUserId!);
            setRequestSent(true);
            usePlayerStore.getState().addToast({ type: 'success', message: 'Solicitud enviada ✨', duration: 3000 });
        } catch {}
    };

    const handleMessage = () =>
        window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'friends', params: { openChatId: targetUserId } } }));

    const handleShare = async () => {
        const url = `${window.location.origin}/?profile=${targetUserId || user?.id}`;
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
    };

    if (!profile) return (
        <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const displayName = profile?.name || user?.name || 'Usuario';
    const username    = profile?.username || user?.username || 'user';
    const svznId      = (profile?.svzn_id || user?.svzn_id || 0).toString().padStart(6, '0');
    const isPro       = profile?.tier === 'pro';

    return (
        <div className="min-h-full bg-[#050507] text-white overflow-x-hidden">
            <AnimatePresence>
                {modal && (
                    <ConnectionsModal
                        initialTab={modal}
                        connections={connections}
                        onClose={() => setModal(null)}
                        onNavigate={navigate}
                    />
                )}
            </AnimatePresence>

            {/* ── BANNER ── */}
            <div className="relative w-full h-[180px] sm:h-[260px] overflow-hidden group/banner">
                {safeImageSrc(editData.banner) ? (
                    <img src={safeImageSrc(editData.banner)!} className="w-full h-full object-cover" alt="banner" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-indigo-900/30 to-[#050507]" />
                )}
                {/* Gradient overlay bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/40 to-transparent" />

                {/* Back button */}
                {isForeignProfile && (
                    <button onClick={goBack}
                        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-sm font-bold border border-white/20 hover:bg-black/80 transition-all text-white shadow-lg">
                        <ArrowLeft size={16} /> Volver
                    </button>
                )}

                {/* Edit banner button */}
                {isEditing && (
                    <button onClick={() => bannerInputRef.current?.click()}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/banner:opacity-100 transition-opacity backdrop-blur-sm">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 text-sm font-semibold">
                            <Camera size={16} /> Cambiar portada
                        </div>
                    </button>
                )}
                <input ref={bannerInputRef} type="file" hidden accept="image/*" onChange={handleBannerUpload} />
            </div>

            {/* ── PROFILE HEADER ── */}
            <div className="relative px-4 sm:px-8 pb-0 -mt-16 sm:-mt-20">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">

                    {/* Avatar */}
                    <div className="relative shrink-0 group/avatar self-start sm:self-auto">
                        <div className={clsx(
                            'w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl overflow-hidden border-4 shadow-2xl relative',
                            isPro ? 'border-primary/60' : 'border-[#050507]'
                        )}>
                            {safeImageSrc(editData.avatar)
                                ? <img src={safeImageSrc(editData.avatar)!} className="w-full h-full object-cover" alt="avatar" />
                                : <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-4xl font-black text-white/30 uppercase">
                                    {displayName[0]}
                                  </div>
                            }
                            {isEditing && (
                                <div onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                                    <Camera size={20} className="text-white" />
                                </div>
                            )}
                        </div>
                        {/* Online dot */}
                        {!isEditing && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-[3px] border-[#050507] rounded-full shadow-lg" />
                        )}
                        {isPro && (
                            <div className="absolute -top-2 -right-2 bg-primary text-black rounded-full p-1 shadow-lg">
                                <Crown size={10} />
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                    </div>

                    {/* Name + actions row */}
                    <div className="flex-1 min-w-0 pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                {isEditing ? (
                                    <input value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })}
                                        className="bg-transparent text-2xl sm:text-3xl font-black text-white outline-none border-b-2 border-primary/50 w-full pb-1 mb-1"
                                        placeholder="Tu nombre" />
                                ) : (
                                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">{displayName}</h1>
                                )}
                                <p className="text-[12px] text-white/30 font-mono mt-0.5">
                                    @{username} · <span className="text-primary/60">SV{svznId}</span>
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                                {isEditing ? (
                                    <>
                                        <button onClick={() => { setIsEditing(false); setEditData(profile); }}
                                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all">
                                            Cancelar
                                        </button>
                                        <button onClick={handleSave}
                                            className="px-5 py-2 rounded-xl bg-white text-black text-sm font-black hover:bg-white/90 transition-all shadow-lg">
                                            Guardar
                                        </button>
                                    </>
                                ) : isForeignProfile ? (
                                    <>
                                        <button onClick={sendRequest} disabled={!isFriend && requestSent}
                                            className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border',
                                                isFriend ? 'bg-white/5 border-white/10 text-white/70 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                                    : requestSent ? 'bg-white/5 border-white/10 text-white/30 cursor-default'
                                                        : 'bg-primary border-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]'
                                            )}>
                                            {isFriend ? <><UserCheck size={15} /> Siguiendo</> : requestSent ? 'Enviado' : <><UserPlus size={15} /> Seguir</>}
                                        </button>
                                        <button onClick={handleMessage}
                                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all">
                                            Mensaje
                                        </button>
                                        <button onClick={handleShare}
                                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                                            {copied ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all">
                                            <Edit3 size={14} /> Editar perfil
                                        </button>
                                        <button onClick={handleShare}
                                            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                                            {copied ? <Check size={16} className="text-emerald-400" /> : <Link size={16} />}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── BIO ── */}
                <div className="mt-4 max-w-xl">
                    {isEditing ? (
                        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 focus:border-white/25 outline-none resize-none transition-colors"
                            placeholder="Escribe algo sobre ti..." />
                    ) : (
                        <p className="text-sm text-white/50 leading-relaxed">
                            {bio || <span className="italic text-white/20">Sin biografía</span>}
                        </p>
                    )}
                </div>

                {/* ── STATS ROW ── */}
                <div className="flex items-center gap-1 mt-4 -mx-1">
                    <StatPill value={stats.following}  label="Siguiendo"  onClick={() => setModal('following')} />
                    <div className="w-px h-6 bg-white/10" />
                    <StatPill value={stats.followers}  label="Seguidores" onClick={() => setModal('followers')} />
                    <div className="w-px h-6 bg-white/10" />
                    <StatPill value={stats.friends}    label="Amigos"     onClick={() => setModal('friends')} />
                    <div className="w-px h-6 bg-white/10" />
                    <StatPill value={stats.publicPlaylists} label="Playlists" />
                </div>
            </div>

            {/* ── ANTHEM ── */}
            <div className="px-4 sm:px-8 mt-6">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-3">Canción del momento</p>
                <ProfileAnthem isForeign={isForeignProfile} userId={targetUserId} />
            </div>

            {/* ── SECTION TABS ── */}
            <div className="px-4 sm:px-8 mt-8 border-b border-white/[0.06]">
                <div className="flex gap-0">
                    {([
                        { id: 'music',     label: 'Música',    icon: Headphones },
                        { id: 'playlists', label: 'Playlists', icon: Radio },
                        { id: 'stats',     label: 'Stats',     icon: BarChart3 },
                    ] as const).map(s => (
                        <button key={s.id} onClick={() => setActiveSection(s.id)}
                            className={clsx('flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all',
                                activeSection === s.id
                                    ? 'text-white border-white'
                                    : 'text-white/30 border-transparent hover:text-white/60'
                            )}>
                            <s.icon size={13} />
                            <span className="hidden sm:inline">{s.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── SECTION CONTENT ── */}
            <div className="px-4 sm:px-8 py-6 pb-32">
                <AnimatePresence mode="wait">
                    {activeSection === 'music' && (
                        <motion.div key="music" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {recentFavorites.length > 0 ? (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Favoritos recientes</p>
                                    {recentFavorites.map((track, i) => (
                                        <button key={track.id || i}
                                            onClick={() => usePlayerStore.getState().playUnifiedCollection(recentFavorites, i, { type: 'library', name: 'Favoritos' })}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.04] transition-all group text-left">
                                            <span className="text-[10px] font-mono text-white/20 w-5 text-center shrink-0">{i + 1}</span>
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/5 shrink-0">
                                                {track.artwork
                                                    ? <img src={typeof track.artwork === 'string' ? track.artwork : (track.artwork?.medium || track.artwork?.large || '')} className="w-full h-full object-cover" />
                                                    : <Disc size={16} className="m-3 text-white/20" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white/80 group-hover:text-white truncate transition-colors">{track.title}</p>
                                                <p className="text-[11px] text-white/30 truncate">{track.artist}</p>
                                            </div>
                                            <Heart size={14} className="text-rose-500 fill-rose-500 shrink-0 opacity-60" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                    <Headphones size={40} className="mb-3" />
                                    <p className="text-sm font-medium">Sin música favorita aún</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeSection === 'playlists' && (
                        <motion.div key="playlists" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {!isForeignProfile && (
                                <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'playlists', params: { openCreateModal: true } } }))}
                                    className="w-full flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] transition-all mb-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                        <Plus size={18} className="text-white/40 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-sm font-semibold text-white/40 group-hover:text-white/70 transition-colors">Crear nueva playlist</span>
                                </button>
                            )}
                            {playlists.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {playlists.map(pl => (
                                        <button key={pl.id} onClick={() => navigateToPlaylist(pl.id)}
                                            className="group text-left flex flex-col gap-2">
                                            <PlaylistMosaic pl={pl} />
                                            <div className="px-0.5">
                                                <p className="text-sm font-semibold text-white/80 group-hover:text-white truncate transition-colors">{pl.name}</p>
                                                <p className="text-[11px] text-white/30 mt-0.5">
                                                    {pl.trackIds?.length ?? pl.track_count ?? 0} pistas
                                                    {(pl.isPublic || pl.is_public) ? ' · Pública' : ''}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                    <Radio size={40} className="mb-3" />
                                    <p className="text-sm font-medium">Sin playlists</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeSection === 'stats' && (
                        <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Canciones',  value: stats.publicPlaylists * 12, icon: Music,     color: 'from-blue-500/20 to-blue-600/10' },
                                    { label: 'Favoritos',  value: recentFavorites.length,     icon: Heart,     color: 'from-rose-500/20 to-rose-600/10' },
                                    { label: 'Playlists',  value: stats.publicPlaylists,      icon: Radio,     color: 'from-violet-500/20 to-violet-600/10' },
                                    { label: 'Amigos',     value: stats.friends,              icon: Users,     color: 'from-emerald-500/20 to-emerald-600/10' },
                                ].map(s => (
                                    <div key={s.label} className={clsx('p-4 rounded-2xl bg-gradient-to-br border border-white/5', s.color)}>
                                        <s.icon size={20} className="text-white/40 mb-3" />
                                        <p className="text-2xl font-black text-white">{s.value}</p>
                                        <p className="text-[11px] text-white/30 uppercase tracking-widest mt-1">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-3">Estadísticas detalladas</p>
                                <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'stats', params: { userId: targetUserId || user?.id } } }))}
                                    className="flex items-center gap-2 text-sm text-primary/70 hover:text-primary transition-colors font-semibold">
                                    <BarChart3 size={14} /> Ver estadísticas completas
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── LOGOUT (own profile) ── */}
            {!isForeignProfile && !isEditing && (
                <div className="px-4 sm:px-8 pb-8 flex justify-center">
                    <button onClick={() => { setIsLoggingOut(true); logout(); }}
                        className="flex items-center gap-2 text-xs font-bold text-red-500/40 hover:text-red-500 transition-colors uppercase tracking-widest px-4 py-2 hover:bg-red-500/10 rounded-full">
                        <LogOut size={13} /> {isLoggingOut ? 'Saliendo...' : 'Cerrar sesión'}
                    </button>
                </div>
            )}
        </div>
    );
};
