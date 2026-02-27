import React, { useState, useEffect } from 'react';
import { Monitor, Users, Bell, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfile } from '@utils/database';
import { usePlayerStore } from '@store/player';
import { NotificationsPopover, ProfilePopover } from './HeaderPopovers';
import { useTranslation } from '@hooks/useTranslation';
import { shallow } from 'zustand/shallow';
import { WindowControls } from './WindowControls';

interface HeaderProps {
    onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [devicesOpen, setDevicesOpen] = useState(false);
    const [friendsOpen, setFriendsOpen] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const { searchQuery, setSearchQuery } = usePlayerStore(
        (state) => ({
            searchQuery: state.searchQuery,
            setSearchQuery: state.setSearchQuery,
        }),
        shallow
    );
    const { t } = useTranslation();

    useEffect(() => {
        const loadProfile = async () => {
            const data = await getProfile();
            setProfile(data);
        };
        loadProfile();

        const handleUpdate = () => loadProfile();
        window.addEventListener('profile-updated', handleUpdate);
        return () => window.removeEventListener('profile-updated', handleUpdate);
    }, []);

    if (!profile) return null;

    return (
        <header className="h-20 px-8 flex items-center justify-between relative z-40 bg-transparent no-drag">
            {/* Búsqueda funcional */}
            <div className="flex-1 max-w-2xl px-4">
                <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-all duration-300" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (e.target.value.trim()) onNavigate('search');
                        }}
                        placeholder={t('header.searchPlaceholder')}
                        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-2xl py-3 pl-14 pr-6 text-sm font-medium text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/[0.07] transition-all duration-300"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {/* Monitor / Dispositivos */}
                <div className="relative">
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setDevicesOpen(!devicesOpen); setFriendsOpen(false); setNotifOpen(false); setProfileOpen(false); }}
                        className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                    >
                        <Monitor size={16} />
                    </motion.button>
                </div>

                {/* Users / Amigos */}
                <div className="relative">
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setFriendsOpen(!friendsOpen); setDevicesOpen(false); setNotifOpen(false); setProfileOpen(false); }}
                        className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                    >
                        <Users size={16} />
                    </motion.button>
                </div>

                {/* Bell con popover */}
                <div className="relative">
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); setDevicesOpen(false); setFriendsOpen(false); }}
                        className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all relative"
                    >
                        <Bell size={16} />
                        <div className="absolute top-1 right-1 pointer-events-none" id="notification-badge-anchor"></div>
                    </motion.button>
                    <AnimatePresence>
                        {notifOpen && (
                            <NotificationsPopover onClose={() => setNotifOpen(false)} />
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-7 w-[1px] bg-white/10 mx-1" />

                {/* Profile con popover */}
                <div className="relative">
                    <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); setDevicesOpen(false); setFriendsOpen(false); }}
                        className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.07] rounded-full p-1 pr-3.5 hover:bg-white/[0.08] transition-all cursor-pointer"
                    >
                        <div className="w-7 h-7 rounded-full bg-white/10 overflow-hidden border border-white/10 flex-shrink-0">
                            {profile.avatar ? (
                                <img src={profile.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/60">
                                    {(profile.name || 'U')[0]}
                                </div>
                            )}
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-xs font-bold text-white/80 leading-tight">{profile.name}</p>
                            <p className="text-[9px] text-white/30 uppercase tracking-wider">{profile.tier === 'pro' ? 'Pro' : 'Standard'}</p>
                        </div>
                    </motion.button>
                    <AnimatePresence>
                        {profileOpen && (
                            <ProfilePopover
                                profile={profile}
                                onNavigate={onNavigate}
                                onClose={() => setProfileOpen(false)}
                            />
                        )}
                    </AnimatePresence>
                </div>
                <WindowControls />
            </div>
        </header>
    );
};
