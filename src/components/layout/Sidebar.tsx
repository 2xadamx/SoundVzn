import React from 'react';
import { Home, Search, Radio, ListMusic, Music, Disc, Mic2, Settings } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useTranslation } from '@hooks/useTranslation';
import type { TranslationKey } from '@utils/i18n';

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active, onClick }) => (
    <motion.div
        whileHover={{ x: 4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={clsx(
            'flex items-center gap-4 px-5 py-3.5 rounded-2xl cursor-pointer transition-all duration-400 group relative overflow-hidden',
            active
                ? 'bg-white/10 text-white shadow-[0_10px_20px_rgba(0,0,0,0.2),inset_0_2px_10px_rgba(255,255,255,0.05)] border border-white/10'
                : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'
        )}
    >
        {/* Neon Glow Indicator (consistent with lyrics mode aesthetics) */}
        {active && (
            <motion.div
                layoutId="activeIndicator"
                className="absolute left-0 w-1.5 h-6 bg-white rounded-full shadow-[0_0_15px_white] z-20"
                transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
            />
        )}

        <Icon size={22} strokeWidth={active ? 2.5 : 2} className={clsx(
            'transition-all duration-400',
            active ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'group-hover:text-white/80 group-hover:scale-110'
        )} />

        <span className={clsx(
            "font-black text-sm tracking-tight transition-colors duration-400",
            active ? "text-white" : "group-hover:text-white/80"
        )}>
            {label}
        </span>

        {/* Subtle Background Glow for Active Item */}
        {active && (
            <div className="absolute inset-0 bg-white/5 pointer-events-none opacity-40" />
        )}
    </motion.div>
);

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="px-5 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3 mt-10">
        {title}
    </h3>
);

const MAIN_NAV_ITEMS: Array<{ icon: React.ElementType; view: string; labelKey: TranslationKey }> = [
    { icon: Home, view: 'home', labelKey: 'nav.home' },
    { icon: Search, view: 'search', labelKey: 'nav.browse' },
    { icon: Radio, view: 'radio', labelKey: 'nav.radio' },
];

const COLLECTION_NAV_ITEMS: Array<{ icon: React.ElementType; view: string; labelKey: TranslationKey }> = [
    { icon: ListMusic, view: 'playlists', labelKey: 'nav.playlists' },
    { icon: Music, view: 'library', labelKey: 'nav.library' },
    { icon: Disc, view: 'albums', labelKey: 'nav.albums' },
    { icon: Mic2, view: 'artists', labelKey: 'nav.artists' },
];

interface SidebarProps {
    currentView: string;
    onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
    const { t } = useTranslation();

    return (
        <aside className="w-72 h-full bg-black/20 backdrop-blur-[100px] flex flex-col border-r border-white/10 no-drag relative overflow-hidden z-30 shadow-[20px_0_50px_rgba(0,0,0,0.3)]">

            {/* Dynamic Background Accents */}
            <div className="absolute top-[-10%] left-[-20%] w-[150%] h-[30%] bg-white/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-20%] w-[100%] h-[20%] bg-white/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative z-10 p-8 flex flex-col h-full">
                {/* Immersive Banner Area */}
                <div
                    className="mb-10 group cursor-pointer relative -mx-4"
                    onClick={() => onNavigate('home')}
                >
                    <motion.div
                        className="w-full h-32 overflow-hidden relative"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 1 }}
                    >
                        <img
                            src="banner-splash.jpeg"
                            alt="SoundVizion"
                            className="w-full h-full object-contain relative z-10 scale-125"
                            style={{
                                WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 90%)',
                                maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 90%)'
                            }}
                        />
                    </motion.div>

                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full opacity-30 pointer-events-none scale-150" />
                </div>
                {/* Main Navigation */}
                <nav className="space-y-2">
                    {MAIN_NAV_ITEMS.map((item) => (
                        <NavItem
                            key={item.view}
                            icon={item.icon}
                            label={t(item.labelKey)}
                            active={currentView === item.view}
                            onClick={() => onNavigate(item.view)}
                        />
                    ))}
                </nav>

                <SectionTitle title={t('nav.section.collection')} />
                <nav className="space-y-2 flex-1 overflow-y-auto scroll-none">
                    {COLLECTION_NAV_ITEMS.map((item) => (
                        <NavItem
                            key={item.view}
                            icon={item.icon}
                            label={t(item.labelKey)}
                            active={currentView === item.view}
                            onClick={() => onNavigate(item.view)}
                        />
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-white/5">
                    <NavItem
                        icon={Settings}
                        label={t('nav.settings')}
                        active={currentView === 'settings'}
                        onClick={() => onNavigate('settings')}
                    />
                </div>
            </div>

        </aside>
    );
};
