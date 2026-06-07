import {
    Home,
    Search,
    Disc,
    Mic2,
    Radio,
    ListMusic,
    Music2,
    Users,
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
    badge?: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active, onClick, badge }) => (
    <motion.div
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={clsx(
            'flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 group relative overflow-hidden select-none',
            active
                ? 'text-white border border-white/8'
                : 'text-white/30 hover:text-white/70 hover:bg-white/[0.03] border border-transparent'
        )}
        style={active ? {
            background: 'rgba(255,255,255,0.06)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)',
        } : {}}
    >
        {active && (
            <motion.div
                layoutId="nav-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white"
                style={{ boxShadow: '0 0 12px rgba(255,255,255,0.6)' }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            />
        )}
        <Icon
            size={18}
            strokeWidth={active ? 2.5 : 1.5}
            className={clsx(
                'transition-all duration-300 flex-shrink-0',
                active ? 'text-white' : 'group-hover:text-white/60'
            )}
        />
        <span className={clsx(
            'text-[15px] font-bold tracking-tight transition-colors duration-300 flex-1',
            active ? 'text-white' : 'group-hover:text-white/60'
        )}>
            {label}
        </span>
        {badge && <span className="ml-auto">{badge}</span>}
    </motion.div>
);

interface SidebarProps {
    currentView: string;
    onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
    return (
        <aside style={{
            width: 260,
            height: 'calc(100vh - 72px)',
            background: 'rgba(2,2,4,0.7)',
            backdropFilter: 'blur(80px)',
            WebkitBackdropFilter: 'blur(80px)',
            borderRight: '1px solid rgba(255,255,255,0.04)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 40,
            boxShadow: '15px 0 40px rgba(0,0,0,0.3)'
        }}>
            {/* LOGO BANNER — imagen original de la beta */}
            <div style={{ padding: '36px 40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div className="relative w-full select-none flex items-center justify-center p-0">
                    <img
                        src="/logo-banner.jpg"
                        alt="SoundVzn"
                        style={{
                            width: '100%',
                            height: 'auto',
                            objectFit: 'contain',
                            scale: '1.25'
                        }}
                    />
                </div>
            </div>

            {/* NAVIGATION */}
            <nav className="flex-1 overflow-y-auto py-2 px-3" style={{ scrollbarWidth: 'none' }}>
                <div className="space-y-0.5 mb-6">
                    <NavItem icon={Home} label="Inicio" active={currentView === 'home'} onClick={() => onNavigate('home')} />
                    <NavItem icon={Search} label="Explorar" active={currentView === 'search'} onClick={() => onNavigate('search')} />
                    <NavItem
                        icon={Radio}
                        label="Radio"
                        active={currentView === 'radio'}
                        onClick={() => onNavigate('radio')}
                    />
                    <NavItem icon={Users} label="Amigos" active={currentView === 'friends'} onClick={() => onNavigate('friends')} />
                </div>

                <div className="space-y-0.5">
                    <p style={{
                        padding: '0 16px',
                        fontSize: 9,
                        fontWeight: 800,
                        color: 'rgba(255,255,255,0.15)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.16em',
                        marginBottom: 12,
                        marginTop: 8
                    }}>Colección</p>
                    <NavItem icon={ListMusic} label="Playlists" active={currentView === 'playlists'} onClick={() => onNavigate('playlists')} />
                    <NavItem icon={Music2} label="Tu Música" active={currentView === 'library'} onClick={() => onNavigate('library')} />
                    <NavItem icon={Disc} label="Discos" active={currentView === 'albums'} onClick={() => onNavigate('albums')} />
                    <NavItem icon={Mic2} label="Artistas" active={currentView === 'artists'} onClick={() => onNavigate('artists')} />
                </div>
            </nav>
        </aside>
    );
};
