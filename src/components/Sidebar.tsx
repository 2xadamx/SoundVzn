import React from 'react';
import { motion } from 'framer-motion';

interface SidebarProps {
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentView }) => {
  const menuItems = [
    { id: 'library', label: 'Biblioteca', icon: '🎵' },
    { id: 'search', label: 'Buscar Música', icon: '🔍' },
    { id: 'equalizer', label: 'Ecualizador', icon: '🎛️' },
    { id: 'focus', label: 'Modo Focus', icon: '🎯' },
    { id: 'stats', label: 'Estadísticas', icon: '📊' },
    { id: 'playlists', label: 'Playlists', icon: '📋' },
    { id: 'albums', label: 'Álbumes', icon: '💿' },
    { id: 'artists', label: 'Artistas', icon: '🎤' },
    { id: 'settings', label: 'Configuración', icon: '⚙️' },
  ];

  return (
    <div className="w-64 bg-dark-800 border-r border-dark-600 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          SoundVzn
        </h1>
        <p className="text-xs text-gray-500 mt-1">Hi-Res Audio Player</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(item.id)}
            className={`w-full px-4 py-3 rounded-lg flex items-center space-x-3 transition-all ${
              currentView === item.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-dark-700 hover:text-white'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </motion.button>
        ))}
      </nav>

      <div className="p-4 border-t border-dark-600">
        <div className="bg-dark-700 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-2">Calidad de Audio</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">24-bit / 192kHz</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
