import React from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@store/player';

interface StatsData {
  totalTracks: number;
  totalListenTime: number;
  topArtist: string;
  topGenre: string;
  mostPlayed: string;
  thisWeek: number;
}

export const Stats: React.FC = () => {
  const { currentTrack } = usePlayerStore();

  const mockStats: StatsData = {
    totalTracks: 1247,
    totalListenTime: 52840,
    topArtist: 'The Weeknd',
    topGenre: 'R&B',
    mostPlayed: 'Blinding Lights',
    thisWeek: 18,
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} días`;
    if (hours > 0) return `${hours} horas`;
    return `${minutes} min`;
  };

  const statCards = [
    {
      label: 'Canciones Totales',
      value: mockStats.totalTracks.toLocaleString(),
      icon: '🎵',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Tiempo Escuchado',
      value: formatTime(mockStats.totalListenTime),
      icon: '⏱️',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Artista Favorito',
      value: mockStats.topArtist,
      icon: '🎤',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      label: 'Género Favorito',
      value: mockStats.topGenre,
      icon: '🎸',
      gradient: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Tus Estadísticas</h1>
        <p className="text-gray-400">Descubre cómo disfrutas tu música</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className={`relative p-6 rounded-2xl bg-gradient-to-br ${stat.gradient} overflow-hidden group cursor-pointer`}
          >
            <motion.div
              className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"
            />
            
            <div className="relative z-10">
              <div className="text-4xl mb-3">{stat.icon}</div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-white/80">{stat.label}</div>
            </div>

            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
              className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-dark-800 rounded-2xl p-6 border border-dark-600"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <span className="text-2xl mr-2">🔥</span>
            Top 5 Esta Semana
          </h2>
          
          {[1, 2, 3, 4, 5].map((rank) => (
            <motion.div
              key={rank}
              whileHover={{ x: 10, backgroundColor: '#1a1a1a' }}
              className="flex items-center space-x-4 p-3 rounded-lg mb-2 cursor-pointer transition-colors"
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                ${rank === 1 ? 'bg-yellow-500 text-black' : 
                  rank === 2 ? 'bg-gray-300 text-black' : 
                  rank === 3 ? 'bg-orange-600 text-white' : 
                  'bg-dark-700 text-gray-400'}
              `}>
                {rank}
              </div>
              
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xl">
                🎵
              </div>
              
              <div className="flex-1">
                <div className="text-white font-semibold">Canción {rank}</div>
                <div className="text-gray-400 text-sm">Artista {rank}</div>
              </div>
              
              <div className="text-right">
                <div className="text-primary-400 font-semibold">{150 - rank * 10}</div>
                <div className="text-gray-500 text-xs">reproducciones</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-dark-800 rounded-2xl p-6 border border-dark-600"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            Actividad Reciente
          </h2>

          <div className="space-y-4">
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, index) => {
              const value = Math.random() * 100;
              return (
                <div key={day}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 text-sm">{day}</span>
                    <span className="text-white font-semibold text-sm">{Math.floor(value * 2)}m</span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-700 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-8 text-center"
      >
        <h3 className="text-3xl font-bold text-white mb-2">🎉 SoundVzn Wrapped 2026</h3>
        <p className="text-gray-300 mb-4">Tu resumen musical anual estará disponible pronto</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold"
        >
          Notificarme
        </motion.button>
      </motion.div>
    </div>
  );
};
