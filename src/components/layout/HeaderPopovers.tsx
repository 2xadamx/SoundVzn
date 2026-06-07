/**
 * HeaderPopovers.tsx — Popovers de alta fidelidad para Perfil y Notificaciones.
 * CSS completamente alineado con el design system de SoundVizion (glassmorphism dark).
 */
import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Bell, Check, Music2, Star, Download, Zap, Sparkles, ChevronRight, Trash2, Info, AlertTriangle,
    UserPlus, Disc3, User, Heart, ListMusic, Settings, LogOut, Search,
    Monitor, Volume2, VolumeX
} from 'lucide-react';
import clsx from 'clsx';
import { useNotificationsStore, NotificationType } from '../../store/notifications';
import { createPortal } from 'react-dom';
import { useTranslation } from '@hooks/useTranslation';
import { toSentenceCase } from '@utils/formatters';
import api from '../../utils/api';
import { usePlayerStore } from '../../store/player';
import { safeImageSrc } from '../../utils/imageUrl';

// ─── Shared Popover Shell ──────────────────────────────────────────────────────

const popoverVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.12 } },
};

const PopoverShell = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
    ({ children, className }, ref) => (
        <motion.div
            ref={ref}
            variants={popoverVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={clsx(
                "absolute top-full mt-3 bg-black/60 backdrop-blur-[80px] border border-white/10",
                "rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.04] z-50 overflow-hidden",
                // En móvil: anclado a la derecha con margen para no salirse de pantalla
                "right-0 max-w-[calc(100vw-16px)]",
                className
            )}
        >
            {children}
        </motion.div>
    )
);
PopoverShell.displayName = 'PopoverShell';

const Divider = () => <div className="h-px bg-white/[0.05] mx-0" />;

// ─── Notificaciones ────────────────────────────────────────────────────────────

// ─── Mapper de íconos para notificaciones
const NOTIF_ICONS: Record<NotificationType, { icon: React.ElementType, bg: string }> = {
    music: { icon: Music2, bg: 'bg-blue-500/15 text-blue-400 border-blue-400/20' },
    download: { icon: Download, bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-400/20' },
    star: { icon: Star, bg: 'bg-amber-500/15 text-amber-400 border-amber-400/20' },
    pro: { icon: Zap, bg: 'bg-violet-500/15 text-violet-400 border-violet-400/20' },
    info: { icon: Info, bg: 'bg-gray-500/15 text-gray-400 border-gray-400/20' },
    alert: { icon: AlertTriangle, bg: 'bg-red-500/15 text-red-400 border-red-400/20' },
    system: { icon: Zap, bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-400/20' },
    achievement: { icon: Sparkles, bg: 'bg-amber-500/15 text-amber-400 border-amber-400/20' },
};

export interface NotificationsPopoverProps { onClose: () => void; }

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ onClose }) => {
    const { notifications, markAllRead, clearAll } = useNotificationsStore();
    const ref = useRef<HTMLDivElement>(null);
    const unreadCount = notifications.filter(n => n.unread).length;
    const { t } = useTranslation();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Calcular el tiempo transcurrido
    const getTimeAgo = (timestamp: number) => {
        const diff = Math.floor((Date.now() - timestamp) / 60000);
        if (diff < 1) return t('notifications.justNow');
        if (diff < 60) return t('notifications.minutesAgo', { value: diff });
        if (diff < 1440) return t('notifications.hoursAgo', { value: Math.floor(diff / 60) });
        return t('notifications.daysAgo', { value: Math.floor(diff / 1440) });
    };

    return (
        <>
            {/* Renderizar el badge en el DOM (Portal para evitar z-index conflicts si es necesario, pero aquí lo haremos inline en Header) */}
            {document.getElementById('notification-badge-anchor') && unreadCount > 0 && createPortal(
                <span className="w-1.5 h-1.5 bg-white rounded-full block" />,
                document.getElementById('notification-badge-anchor')!
            )}

            <PopoverShell ref={ref} className="w-80">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Bell size={14} className="text-white/40" />
                        <span className="text-xs font-bold text-white/80">{t('notifications.title')}</span>
                        {unreadCount > 0 && (
                            <span className="min-w-[18px] h-[18px] rounded-full bg-white/90 text-black text-[9px] font-black flex items-center justify-center px-1">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-[9px] font-bold text-white/25 hover:text-white/60 transition-colors tracking-wider"
                                title={t('notifications.markAllRead')}
                            >
                                <Check size={11} />
                                {toSentenceCase(t('notifications.markAllRead'))}
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="flex items-center gap-1 text-[9px] font-bold text-white/25 hover:text-red-400/80 transition-colors tracking-wider"
                                title={t('notifications.clearAll')}
                            >
                                <Trash2 size={11} />
                                {toSentenceCase(t('notifications.clearAll'))}
                            </button>
                        )}
                    </div>
                </div>
                <Divider />

                {/* Lista */}
                <div className="max-h-72 overflow-y-auto scrollbar-hide">
                    {notifications.length === 0 ? (
                        <div className="px-5 py-8 text-center flex flex-col items-center">
                            <Bell size={24} className="text-white/10 mb-2" />
                            <p className="text-xs text-white/30 font-medium">{t('notifications.none')}</p>
                        </div>
                    ) : (
                        notifications.map((n, i) => {
                            const iconData = NOTIF_ICONS[n.type];
                            const IconCmp = iconData.icon;
                            return (
                                <React.Fragment key={n.id}>
                                    <div className={clsx(
                                        "flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer",
                                        n.unread && "bg-white/[0.015]"
                                    )}>
                                        <div className={clsx(
                                            "w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5",
                                            iconData.bg
                                        )}>
                                            <IconCmp size={13} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white/80 leading-tight">{n.title}</p>
                                            <p className="text-[10px] text-white/35 mt-0.5 leading-tight">{n.body}</p>
                                            <p className="text-[9px] text-white/20 mt-1">{getTimeAgo(n.timestamp)}</p>
                                        </div>
                                        {n.unread && <div className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0 mt-1.5" />}
                                    </div>
                                    {i < notifications.length - 1 && <Divider />}
                                </React.Fragment>
                            );
                        })
                    )}
                </div>

                <Divider />
                <button className="w-full flex items-center justify-center gap-1.5 py-3.5 text-[9px] font-bold text-white/25 hover:text-white/50 transition-colors tracking-widest">
                    {toSentenceCase(t('notifications.history'))}
                    <ChevronRight size={10} />
                </button>
            </PopoverShell>
        </>
    );
};



// ─── Friends Activity Popover ────────────────────────────────

export const FriendsPopover: React.FC<{ onClose: () => void; onNavigate?: (view: string, params?: any) => void }> = ({ onClose, onNavigate }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    useEffect(() => {
        api.get('/api/social/friends')
           .then((res: any) => setFriends(res.data))
           .catch((err: any) => console.error(err))
           .finally(() => setLoading(false));
    }, []);

    const handleViewAll = () => {
        if (onNavigate) {
            onNavigate('friends');
        } else {
            window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'friends' }));
        }
        onClose();
    };

    return (
        <PopoverShell ref={ref} className="w-72 right-0">
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex items-center gap-2">
                    <UserPlus size={14} className="text-white/40" />
                    <span className="text-xs font-semibold text-white/80">{t('friends.title') || 'Actividad'}</span>
                </div>
                <button 
                  onClick={handleViewAll}
                  className="text-[10px] font-medium text-white/40 hover:text-white transition-colors"
                >
                  Ver Todo
                </button>
            </div>
            
            <Divider />
            
            <div className="max-h-60 overflow-y-auto pt-2">
                {loading ? (
                    <div className="px-5 py-4 text-center text-[11px] text-white/30">Cargando...</div>
                ) : friends.length === 0 ? (
                    <div className="px-5 py-4 text-center text-[11px] text-white/30">No hay actividad reciente.</div>
                ) : friends.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-white/10 text-white/60 font-semibold text-sm ring-1 ring-white/5">
                            {safeImageSrc(f.avatar) ? (
                                <img src={safeImageSrc(f.avatar)!} className="w-full h-full object-cover" alt="" />
                            ) : (
                                f.name?.charAt(0).toUpperCase() || '?'
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <span className="text-xs font-semibold text-white/90 truncate">{f.name}</span>
                            </div>
                            <p className="text-[11px] text-white/50 truncate flex items-center gap-1.5 mt-1">
                                {f.activity?.track ? (
                                    <>
                                        <Disc3 size={11} className="flex-shrink-0 animate-spin-slow text-green-400 opacity-60" />
                                        <span className="text-green-400/80">{f.activity.track}</span>
                                    </>
                                ) : (
                                    <span className="text-white/30 truncate">{f.status === 'online' ? 'Conectado' : 'Desconectado'}</span>
                                )}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="py-2" />
        </PopoverShell>
    );
};

// ─── Profile Popover ───────────────────────────────────────────────────────────

interface ProfilePopoverProps {
    profile: any;
    onNavigate: (view: string) => void;
    onClose: () => void;
}

const MenuItem: React.FC<{
    icon: React.ElementType;
    label: string;
    badge?: number;
    danger?: boolean;
    onClick?: () => void;
}> = ({ icon: Icon, label, badge, danger, onClick }) => (
    <button
        onClick={onClick}
        className={clsx(
            "w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors rounded-xl group",
            danger
                ? "text-red-400/60 hover:text-red-400 hover:bg-red-500/8"
                : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
        )}
    >
        <Icon size={14} className="flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {badge !== undefined && badge > 0 && (
            <span className="min-w-[18px] h-[18px] rounded-full bg-white/8 text-white/40 text-[9px] font-bold flex items-center justify-center px-1">
                {badge}
            </span>
        )}
        {!danger && <ChevronRight size={10} className="opacity-0 group-hover:opacity-30 transition-opacity" />}
    </button>
);

export const ProfilePopover: React.FC<ProfilePopoverProps> = ({ profile, onNavigate, onClose }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const nav = (view: string) => { onNavigate(view); onClose(); };

    const statItems = [
        { label: t('profile.stats.songs'), value: profile?.stats?.songs || 0 },
        { label: t('profile.stats.favorites'), value: profile?.stats?.favorites || 0 },
        { label: t('profile.stats.hours'), value: profile?.stats?.hours || 0 },
    ];

    return (
        <PopoverShell ref={ref} className="w-72">
            {/* User info */}
            <div className="p-5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                        {safeImageSrc(profile?.avatar) ? (
                            <img src={safeImageSrc(profile?.avatar)!} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User size={18} className="text-white/30" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white/90 truncate">{profile?.name || 'Usuario'}</p>
                        <p className="text-[10px] text-white/30 truncate">{profile?.email || ''}</p>
                        <p className="text-[9px] text-white/20 mt-1 uppercase tracking-widest font-black">Escuchando ahora</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <Divider />
            <div className="grid grid-cols-3 divide-x divide-white/[0.05] py-1">
                {statItems.map(stat => (
                    <div key={stat.label} className="py-3 flex flex-col items-center gap-1">
                        <p className="text-sm font-bold text-white/80">{stat.value}</p>
                        <p className="text-[9px] text-white/25 tracking-wider">{toSentenceCase(stat.label)}</p>
                    </div>
                ))}
            </div>

            {/* Menu */}
            <Divider />
            <div className="p-2">
                <MenuItem icon={User} label={t('profile.menu.myProfile')} onClick={() => nav('profile')} />
                <MenuItem icon={Heart} label={t('profile.menu.favorites')} badge={profile?.stats?.favorites} onClick={() => nav('library')} />
                <MenuItem icon={ListMusic} label={t('profile.menu.playlists')} onClick={() => nav('playlists')} />
                <MenuItem icon={Settings} label={t('profile.menu.settings')} onClick={() => nav('settings')} />
            </div>

            <Divider />
            <div className="p-2">
                <MenuItem
                    icon={LogOut}
                    label={t('profile.menu.logout')}
                    danger
                    onClick={() => {
                        localStorage.removeItem('svzn_token');
                        localStorage.removeItem('auth_access_token');
                        localStorage.removeItem('google_token');
                        window.location.reload();
                    }}
                />
            </div>
        </PopoverShell>
    );
};
// ─── Devices Popover ──────────────────────────────────────────────────────────

export const DevicesPopover: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { volume, setVolume, muted, toggleMute } = usePlayerStore();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Detectar dispositivo de salida actual (solo disponible en algunos navegadores)
    const [outputLabel, setOutputLabel] = useState<string>('Dispositivo predeterminado');
    useEffect(() => {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const audioOut = devices.find(d => d.kind === 'audiooutput' && d.deviceId === 'default');
            if (audioOut?.label) setOutputLabel(audioOut.label);
        }).catch(() => {});
    }, []);

    return (
        <PopoverShell ref={ref} className="w-72">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.05]">
                <Monitor size={14} className="text-white/40" />
                <span className="text-xs font-bold text-white/80">Dispositivos de audio</span>
            </div>

            <div className="p-4 space-y-4">
                {/* Dispositivo activo */}
                <div className="flex items-center gap-3 p-3 bg-white/[0.04] border border-white/[0.06] rounded-2xl">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <Volume2 size={16} className="text-white/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white/90 truncate">{outputLabel}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">Salida activa</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                </div>

                {/* Control de volumen */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Volumen</span>
                        <span className="text-[10px] font-mono text-white/40">{Math.round((muted ? 0 : volume) * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={toggleMute} className="text-white/30 hover:text-white transition-colors shrink-0">
                            {muted || volume === 0
                                ? <VolumeX size={14} />
                                : <Volume2 size={14} />
                            }
                        </button>
                        <div className="flex-1 relative h-1.5 bg-white/10 rounded-full overflow-hidden group cursor-pointer">
                            <div
                                className="absolute left-0 top-0 h-full bg-white/60 group-hover:bg-white transition-colors rounded-full"
                                style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                            />
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={muted ? 0 : volume}
                                onChange={e => setVolume(parseFloat(e.target.value), true)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <p className="text-[9px] text-white/15 text-center tracking-widest uppercase pt-1">
                    Para cambiar dispositivo, usa los ajustes del sistema
                </p>
            </div>
        </PopoverShell>
    );
};

// ─── Search Suggestions ───────────────────────────────────────

export const SearchSuggestions: React.FC<{ query: string; results: { tracks: any[], artists: any[], albums: any[] }; onClose: () => void; onNavigate: (view: string, params?: any) => void }> = ({ query, results, onClose, onNavigate }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const hasResults = results.tracks.length > 0 || results.artists.length > 0 || results.albums.length > 0;

    if (!query) return null;

    return (
        <PopoverShell ref={ref} className="absolute left-0 w-full max-h-[480px] overflow-hidden flex flex-col pt-2 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.05]">
                <Search size={12} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sugerencias para</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80 truncate">"{query}"</span>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
                {!hasResults ? (
                    <div className="px-5 py-10 text-center flex flex-col items-center">
                        <Disc3 size={24} className="text-white/10 mb-2 animate-pulse" />
                        <p className="text-xs text-white/30 font-medium italic">No se encontraron ecos de tu búsqueda...</p>
                    </div>
                ) : (
                    <div className="space-y-4 px-2 pb-4">
                        {results.artists.length > 0 && (
                            <div>
                                <h4 className="px-3 text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Artistas</h4>
                                {results.artists.slice(0, 3).map((a: any) => (
                                    <button 
                                        key={a.id} 
                                        onClick={() => { onNavigate('artist', { artistId: a.id, artistName: a.name }); onClose(); }}
                                        className="w-full flex items-center gap-3 p-2 hover:bg-white/[0.05] rounded-xl transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 group-hover:ring-primary/50 transition-all">
                                            {a.image ? <img src={a.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-black text-xs">{a.name[0]}</div>}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">{a.name}</p>
                                            <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5">Artista Verificado</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {results.tracks.length > 0 && (
                            <div>
                                <h4 className="px-3 text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Canciones</h4>
                                {results.tracks.slice(0, 5).map((t: any) => (
                                    <button 
                                        key={t.key || `${t.title}-${t.artist}`} 
                                        onClick={() => { 
                                            window.dispatchEvent(new CustomEvent('play-track', { detail: t }));
                                            onClose(); 
                                        }}
                                        className="w-full flex items-center gap-3 p-2 hover:bg-white/[0.05] rounded-xl transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10 transition-all">
                                            {t.artwork?.medium ? <img src={t.artwork.medium} className="w-full h-full object-cover" /> : <Music2 size={16} className="text-white/20 m-auto" />}
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate leading-tight">{t.title}</p>
                                            <p className="text-[10px] text-white/30 font-medium truncate mt-0.5">{t.artist}</p>
                                        </div>
                                        <span className="text-[9px] font-mono text-white/10 pr-2 group-hover:text-primary/50 transition-colors">
                                            {t.duration ? `${Math.floor(t.duration/60)}:${String(t.duration%60).padStart(2, '0')}` : '--:--'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {results.albums.length > 0 && (
                            <div>
                                <h4 className="px-3 text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Álbumes</h4>
                                {results.albums.slice(0, 2).map((a: any) => (
                                    <button 
                                        key={a.id} 
                                        onClick={() => { onNavigate('album', { albumId: a.id, albumName: a.name }); onClose(); }}
                                        className="w-full flex items-center gap-3 p-2 hover:bg-white/[0.05] rounded-xl transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10 transition-all">
                                            {a.image ? <img src={a.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white/10 text-white/20"><Disc3 size={16}/></div>}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-primary transition-colors">{a.name}</p>
                                            <p className="text-[10px] text-white/30 truncate mt-0.5">{a.artist}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <button 
                onClick={() => { onNavigate('search'); onClose(); }}
                className="bg-white/5 hover:bg-primary hover:text-black py-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all border-t border-white/[0.05]"
            >
                Ver todos los resultados
            </button>
        </PopoverShell>
    );
};
