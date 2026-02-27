/**
 * HeaderPopovers.tsx — Popovers de alta fidelidad para Perfil y Notificaciones.
 * CSS completamente alineado con el design system de SoundVizion (glassmorphism dark).
 */
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    User, Heart, ListMusic, Settings, LogOut, Bell,
    Check, Music2, Star, Download, Zap, Sparkles, ChevronRight, Speaker, MonitorPlay, Trash2, UserPlus, Disc3, Info, AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { useNotificationsStore, NotificationType } from '../../store/notifications';
import { createPortal } from 'react-dom';
import { useTranslation } from '@hooks/useTranslation';

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
                // Mismo vidrio que el Sidebar: bg-black/20 backdrop-blur-[100px] border-white/10
                "absolute right-0 mt-3 bg-black/60 backdrop-blur-[80px] border border-white/10",
                "rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.04] z-50 overflow-hidden",
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
                                className="flex items-center gap-1 text-[9px] font-bold text-white/25 hover:text-white/60 transition-colors uppercase tracking-wider"
                                title={t('notifications.markAllRead')}
                            >
                                <Check size={11} />
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="flex items-center gap-1 text-[9px] font-bold text-white/25 hover:text-red-400/80 transition-colors uppercase tracking-wider"
                                title={t('notifications.clearAll')}
                            >
                                <Trash2 size={11} />
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
                <button className="w-full flex items-center justify-center gap-1.5 py-3.5 text-[9px] font-bold text-white/25 hover:text-white/50 transition-colors uppercase tracking-widest">
                    {t('notifications.history')}
                    <ChevronRight size={10} />
                </button>
            </PopoverShell>
        </>
    );
};

// ─── Devices Popover ───────────────────────────────────────────────────────────

export const DevicesPopover: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <PopoverShell ref={ref} className="w-72">
            <div className="flex items-center gap-2 px-5 py-4">
                <MonitorPlay size={14} className="text-white/40" />
                <span className="text-xs font-bold text-white/80">{t('devices.title')}</span>
            </div>
            <Divider />
            <div className="p-2 py-3">
                <button className="w-full flex items-center gap-4 px-3 py-2 rounded-xl bg-white/10 border border-white/10 transition-colors">
                    <MonitorPlay size={16} className="text-[#0ea5e9]" />
                    <div className="flex-1 text-left">
                        <p className="text-xs font-bold text-[#0ea5e9] leading-tight">Este Computador</p>
                        <p className="text-[10px] text-[#0ea5e9]/70 mt-0.5">Escuchando ahora</p>
                    </div>
                    <Speaker size={14} className="text-[#0ea5e9]" />
                </button>
            </div>
            <Divider />
            <div className="p-4 text-center">
                <p className="text-xs font-semibold text-white/40 mb-3">{t('devices.empty')}</p>
            </div>
        </PopoverShell>
    );
};

// ─── Friends Activity Popover ──────────────────────────────────────────────────

const MOCK_FRIENDS = [
    { id: 1, name: "Ana Torres", track: "Starboy", artist: "The Weeknd", time: "Activa ahora", online: true },
    { id: 2, name: "David Kim", track: "Lover", artist: "Taylor Swift", time: "Hace 5m", online: false },
    { id: 3, name: "Maria Garcia", track: "Blinding Lights", artist: "The Weeknd", time: "Hace 1h", online: false }
];

export const FriendsPopover: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <PopoverShell ref={ref} className="w-80">
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                    <UserPlus size={14} className="text-white/40" />
                    <span className="text-xs font-bold text-white/80">{t('friends.title')}</span>
                </div>
            </div>
            <Divider />
            <div className="max-h-72 overflow-y-auto">
                {MOCK_FRIENDS.map((f, i) => (
                    <React.Fragment key={f.id}>
                        <div className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer group">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white/50 text-sm">
                                    {f.name.charAt(0)}
                                </div>
                                {f.online && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#12121a]"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <span className="text-xs font-bold text-white/90 truncate">{f.name}</span>
                                    <span className="text-[9px] text-white/30 ml-2">{f.time}</span>
                                </div>
                                <p className="text-[10px] text-white/50 truncate flex items-center gap-1.5">
                                    <Disc3 size={10} className={clsx("flex-shrink-0", f.online && "animate-spin-slow text-emerald-400")} />
                                    <span className={clsx(f.online && "text-emerald-400/80")}>{f.track}</span>
                                </p>
                                <p className="text-[10px] text-white/30 truncate flex items-center gap-1.5 mt-0.5">
                                    <User size={10} className="flex-shrink-0 invisible" />
                                    {f.artist}
                                </p>
                            </div>
                        </div>
                        {i < MOCK_FRIENDS.length - 1 && <Divider />}
                    </React.Fragment>
                ))}
            </div>
            <Divider />
            <div className="p-4 text-center">
                <p className="text-[10px] text-white/20">{t('friends.empty')}</p>
            </div>
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
                        {profile?.avatar ? (
                            <img src={profile.avatar} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User size={18} className="text-white/30" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white/90 truncate">{profile?.name || 'Usuario'}</p>
                        <p className="text-[10px] text-white/30 truncate">{profile?.email || ''}</p>
                        <div className="mt-1.5 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                            <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider">
                                {profile?.tier === 'pro' ? 'Pro' : 'Standard'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <Divider />
            <div className="grid grid-cols-3 divide-x divide-white/[0.05] py-1">
                {statItems.map(stat => (
                    <div key={stat.label} className="py-3 flex flex-col items-center gap-1">
                        <p className="text-sm font-bold text-white/80">{stat.value}</p>
                        <p className="text-[9px] text-white/25 uppercase tracking-wider">{stat.label}</p>
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
                        localStorage.removeItem('google_token');
                        window.location.reload();
                    }}
                />
            </div>
        </PopoverShell>
    );
};
