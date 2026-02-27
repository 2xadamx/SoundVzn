import React from 'react';
import { motion } from 'framer-motion';
import { getProfile } from '../utils/database';
import { Crown } from 'lucide-react';

interface SidebarProps {
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentView }) => {
  const [tier, setTier] = React.useState<'standard' | 'pro'>('pro');

  React.useEffect(() => {
    const checkTier = async () => {
      const profile = await getProfile();
      setTier(profile.tier);
    };
    checkTier();

    window.addEventListener('profile-updated', checkTier);
    return () => window.removeEventListener('profile-updated', checkTier);
  }, []);

  const categories = [
    {
      label: 'Navegar',
      items: [
        { id: 'home', label: 'Inicio', icon: '🏠' },
        { id: 'search', label: 'Buscar', icon: '🔍' },
        { id: 'radio', label: 'Radio', icon: '📻' },
      ]
    },
    {
      label: 'Tu Música',
      items: [
        { id: 'favorites', label: 'Favoritos', icon: '❤️' },
        { id: 'downloads', label: 'Descargas', icon: '📥' },
        { id: 'liked-artists', label: 'Artistas Followed', icon: '🎤' },
      ]
    },
    {
      label: 'Listas',
      items: [
        { id: 'playlists', label: 'Mis Playlists', icon: '🎵' },
        { id: 'followed-playlists', label: 'Playlists Liked', icon: '🌟' },
      ]
    },
    {
      label: 'Sistema',
      items: [
        { id: 'equalizer', label: 'Ecualizador', icon: '🎛️' },
        { id: 'stats', label: 'Estadísticas', icon: '📊' },
        { id: 'settings', label: 'Ajustes', icon: '⚙️' },
      ]
    }
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-dark-700 flex flex-col relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-secondary-500/5 pointer-events-none" />

      <div className="relative z-10">
        {/* Immersive Banner Area */}
        <div
          className="p-2 pt-6 mb-2 cursor-pointer relative"
          onClick={() => onNavigate('home')}
        >
          <motion.div
            className="w-full h-24 overflow-hidden relative"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <img
              src="/banner-splash.jpeg"
              alt="SoundVizion"
              className="w-full h-full object-contain relative z-10 scale-125"
              style={{
                WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 90%)',
                maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 90%)'
              }}
            />
          </motion.div>
          {/* subtle glow */}
          <div className="absolute inset-x-0 top-0 h-full bg-white/5 blur-3xl rounded-full opacity-20 pointer-events-none" />

          {tier === 'pro' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1 rounded-full border border-amber-300/30 shadow-lg shadow-amber-500/20"
            >
              <Crown size={10} className="text-dark-950 fill-current" />
              <span className="text-[9px] font-bold text-dark-950 tracking-wide">SoundVzn Pro</span>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-250px)] scrollbar-hide">
          {categories.map((category, catIndex) => (
            <div key={category.label} className="space-y-1">
              <h3 className="px-4 text-[11px] font-bold tracking-wider text-text-tertiary mb-2 opacity-60">
                {category.label}
              </h3>
              {category.items.map((item, itemIndex) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (catIndex * 3 + itemIndex) * 0.05 }}
                  whileHover={{ x: 6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full px-4 py-2.5 rounded-xl flex items-center space-x-3 transition-all group relative ${currentView === item.id
                    ? 'bg-gradient-to-r from-primary-500/20 to-secondary-500/20 text-white border border-white/10 shadow-lg'
                    : 'text-text-secondary hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <div className={`text-lg transition-transform group-hover:scale-110 ${currentView === item.id ? 'text-primary drop-shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)]' : ''
                    }`}>
                    {item.icon}
                  </div>

                  <span className={`font-bold text-sm ${currentView === item.id ? 'text-white' : 'text-text-secondary'}`}>
                    {item.label}
                  </span>

                  {/* Active indicator */}
                  {currentView === item.id && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute right-2 w-1 h-5 bg-primary-500 rounded-full shadow-[0_0_10px_#3b82f6]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          ))}
        </nav>

        {/* Audio Quality Status */}
        <div className="p-4 border-t border-dark-700/50">
          <motion.div
            className="bg-gradient-to-br from-card to-dark-700 rounded-2xl p-4 border border-primary-500/20"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-text-tertiary font-bold tracking-wide">Calidad de Audio</p>
              <motion.div
                className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                24-bit / 192kHz
              </span>
              <div className="text-xs text-text-tertiary">Hi-Res</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
