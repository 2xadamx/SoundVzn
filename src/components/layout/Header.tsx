import React, { useState, useEffect } from 'react';
import { Monitor, Users, Bell, Search, Disc3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@store/player';
import { useAuth } from '@store/auth';
import { NotificationsPopover, ProfilePopover, FriendsPopover, SearchSuggestions, DevicesPopover } from './HeaderPopovers';
import { useTranslation } from '@hooks/useTranslation';
import { WindowControls } from './WindowControls';
import { searchEverything } from '@utils/unifiedMusicAPI';
import { shallow } from 'zustand/shallow';
import clsx from 'clsx';
import { safeImageSrc } from '@utils/imageUrl';

interface HeaderProps {
    onNavigate: (view: string, params?: any) => void;
    currentView?: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentView = '' }) => {
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [devicesOpen, setDevicesOpen] = useState(false);
    const [friendsOpen, setFriendsOpen] = useState(false);
    const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
    
    // FASE 4: Usamos useAuth en lugar de getProfile()
    const { user: profile } = useAuth();
    
    const { searchQuery, setSearchQuery } = usePlayerStore(
        (state) => ({
            searchQuery: state.searchQuery,
            setSearchQuery: state.setSearchQuery,
        }),
        shallow
    );
    const { t } = useTranslation();
    
    // No mostrar sugerencias si ya estamos en la vista de búsqueda o explorar
    const isSuggestionsForbidden = currentView === 'search' || currentView === 'browse';

    const [searchResults, setSearchResults] = useState<{ tracks: any[], artists: any[], albums: any[] }>({
        tracks: [],
        artists: [],
        albums: [],
    });
    const [isSearching, setIsSearching] = useState(false);

    // LIVE SEARCH LOGIC
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults({ tracks: [], artists: [], albums: [] });
            setSearchSuggestionsOpen(false);
            return;
        }

        if (isSuggestionsForbidden) {
            setSearchSuggestionsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchEverything(searchQuery);
                setSearchResults(results);
                if (!isSuggestionsForbidden) setSearchSuggestionsOpen(true);
            } catch (e) {
                console.error('Search error:', e);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, isSuggestionsForbidden]);

    if (!profile) return null;

    return (
        <header className="h-16 sm:h-20 px-4 sm:px-8 flex items-center justify-between relative z-40 bg-transparent no-drag">
            {/* Search Bar — hidden on mobile (mobile uses bottom nav search tab) */}
            <div className="hidden sm:flex flex-1 max-w-2xl px-4 relative">
                <div className="relative group w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/50 transition-all duration-500" size={16} strokeWidth={2.5} />
                    <input
                        type="text"
                        value={searchQuery}
                        onFocus={() => { if (searchQuery.trim() && !isSuggestionsForbidden) setSearchSuggestionsOpen(true); }}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (isSuggestionsForbidden && e.target.value.trim()) onNavigate('search');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchQuery.trim()) {
                                onNavigate('search');
                                setSearchSuggestionsOpen(false);
                            }
                        }}
                        placeholder={t('header.searchPlaceholder')}
                        className="w-full bg-white/[0.03] border border-white/[0.05] rounded-full py-3 pl-14 pr-24 text-[13px] font-bold text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/[0.07] transition-all duration-300 backdrop-blur-md"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3">
                        {isSearching && <Disc3 className="animate-spin text-primary/40" size={14} />}
                        <button
                            className="bg-white text-black px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                            onClick={() => { if (searchQuery.trim()) { onNavigate('search'); setSearchSuggestionsOpen(false); } }}
                        >
                            BUSCAR
                        </button>
                    </div>
                </div>
                <AnimatePresence>
                    {searchSuggestionsOpen && !isSuggestionsForbidden && (
                        <SearchSuggestions query={searchQuery} results={searchResults}
                            onClose={() => setSearchSuggestionsOpen(false)} onNavigate={onNavigate} />
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile: logo + search icon */}
            <div className="flex sm:hidden items-center gap-3 flex-1">
                <img src="/logo-banner.jpg" alt="SoundVzn" className="h-6 object-contain" />
                <button onClick={() => onNavigate('search')}
                    className="p-2 text-white/40 hover:text-white transition-colors">
                    <Search size={18} />
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Desktop action buttons */}
                <div className="hidden sm:flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.05] p-1 rounded-[18px]">
                    <div className="relative">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { setDevicesOpen(!devicesOpen); setFriendsOpen(false); setNotifOpen(false); setProfileOpen(false); }}
                            className={clsx("p-2.5 rounded-[14px] transition-all", devicesOpen ? "text-white bg-white/10" : "text-white/30 hover:text-white/60")}>
                            <Monitor size={16} />
                        </motion.button>
                        <AnimatePresence>{devicesOpen && <DevicesPopover onClose={() => setDevicesOpen(false)} />}</AnimatePresence>
                    </div>
                    <div className="relative">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { setFriendsOpen(!friendsOpen); setNotifOpen(false); setDevicesOpen(false); setProfileOpen(false); }}
                            className={clsx("p-2.5 rounded-[14px] transition-all relative", friendsOpen ? "text-white bg-white/10" : "text-white/30 hover:text-white/60")}>
                            <Users size={16} />
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full border border-black" />
                        </motion.button>
                        <AnimatePresence>{friendsOpen && <FriendsPopover onClose={() => setFriendsOpen(false)} onNavigate={onNavigate} />}</AnimatePresence>
                    </div>
                    <div className="relative">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); setDevicesOpen(false); setFriendsOpen(false); }}
                            className={clsx("p-2.5 rounded-[14px] transition-all relative", notifOpen ? "text-white bg-white/10" : "text-white/30 hover:text-white/60")}>
                            <Bell size={16} />
                            <div className="absolute top-1 right-1 pointer-events-none" id="notification-badge-anchor" />
                        </motion.button>
                        <AnimatePresence>{notifOpen && <NotificationsPopover onClose={() => setNotifOpen(false)} />}</AnimatePresence>
                    </div>
                </div>

                {/* Mobile: only bell + avatar */}
                <div className="flex sm:hidden items-center gap-2">
                    <div className="relative">
                        <button onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                            className="p-2 text-white/30 hover:text-white transition-colors relative">
                            <Bell size={18} />
                            <div className="absolute top-1 right-1 pointer-events-none" id="notification-badge-anchor" />
                        </button>
                        <AnimatePresence>{notifOpen && <NotificationsPopover onClose={() => setNotifOpen(false)} />}</AnimatePresence>
                    </div>
                </div>

                <div className="hidden sm:block h-7 w-[1px] bg-white/10 mx-1" />

                {/* Profile */}
                <div className="relative">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); setDevicesOpen(false); setFriendsOpen(false); }}
                        className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-full p-1 sm:pr-3.5 hover:bg-white/[0.08] transition-all cursor-pointer">
                        <div className="w-7 h-7 rounded-full bg-white/10 overflow-hidden border border-white/10 shrink-0">
                            {safeImageSrc(profile?.avatar)
                                ? <img src={safeImageSrc(profile?.avatar)!} className="w-full h-full rounded-full object-cover" alt="" />
                                : <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/60">{(profile.name || 'U')[0]}</div>
                            }
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-xs font-bold text-white/80 leading-tight">{profile.name}</p>
                            <p className="text-[9px] text-white/30 uppercase tracking-wider">Música en vivo</p>
                        </div>
                    </motion.button>
                    <AnimatePresence>
                        {profileOpen && <ProfilePopover profile={profile} onNavigate={onNavigate} onClose={() => setProfileOpen(false)} />}
                    </AnimatePresence>
                </div>
                <WindowControls />
            </div>
        </header>
    );
};
