import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@store/player';

const ambientSounds = [
  { id: 'rain', name: 'Lluvia', icon: '🌧️', color: 'from-blue-500 to-blue-700' },
  { id: 'cafe', name: 'Cafetería', icon: '☕', color: 'from-orange-500 to-orange-700' },
  { id: 'forest', name: 'Bosque', icon: '🌲', color: 'from-green-500 to-green-700' },
  { id: 'ocean', name: 'Océano', icon: '🌊', color: 'from-cyan-500 to-cyan-700' },
  { id: 'fire', name: 'Fogata', icon: '🔥', color: 'from-red-500 to-orange-600' },
  { id: 'city', name: 'Ciudad', icon: '🌆', color: 'from-purple-500 to-purple-700' },
];

export const FocusMode: React.FC = () => {
  const [selectedAmbient, setSelectedAmbient] = useState<string | null>(null);
  const [ambientVolume, setAmbientVolume] = useState(30);
  const { volume } = usePlayerStore();

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Modo Focus</h1>
        <p className="text-gray-400">Combina tu música con ambientes relajantes para máxima concentración</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-3xl p-8 mb-8 border border-dark-600 relative overflow-hidden"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-purple-500/20 blur-3xl"
        />

        <div className="relative z-10">
          <div className="text-center mb-8">
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-6xl"
            >
              {selectedAmbient ? ambientSounds.find(s => s.id === selectedAmbient)?.icon : '🎧'}
            </motion.div>
            
            <h2 className="text-3xl font-bold text-white mb-2">
              {selectedAmbient ? ambientSounds.find(s => s.id === selectedAmbient)?.name : 'Selecciona un Ambiente'}
            </h2>
            <p className="text-gray-400">
              {selectedAmbient ? 'Mezclando con tu música...' : 'Elige un sonido de fondo'}
            </p>
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {ambientSounds.map((sound) => (
              <motion.button
                key={sound.id}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedAmbient(selectedAmbient === sound.id ? null : sound.id)}
                className={`
                  aspect-square rounded-2xl bg-gradient-to-br ${sound.color}
                  flex flex-col items-center justify-center text-4xl
                  transition-all duration-300 relative overflow-hidden
                  ${selectedAmbient === sound.id ? 'ring-4 ring-white shadow-2xl' : 'opacity-60 hover:opacity-100'}
                `}
              >
                {selectedAmbient === sound.id && (
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="absolute inset-0 bg-white/20"
                  />
                )}
                
                <span className="relative z-10 mb-2">{sound.icon}</span>
                <span className="relative z-10 text-xs text-white font-semibold">{sound.name}</span>
              </motion.button>
            ))}
          </div>

          {selectedAmbient && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-900/50 rounded-2xl p-6 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-semibold">Volumen del Ambiente</span>
                <span className="text-primary-400 font-bold">{ambientVolume}%</span>
              </div>
              
              <input
                type="range"
                min="0"
                max="100"
                value={ambientVolume}
                onChange={(e) => setAmbientVolume(parseInt(e.target.value))}
                className="w-full h-2 bg-dark-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
              />

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-dark-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Música</div>
                  <div className="text-2xl font-bold text-white">{Math.round(volume * 100)}%</div>
                </div>
                <div className="bg-dark-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Balance</div>
                  <div className="text-2xl font-bold text-primary-400">Óptimo</div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-dark-800 rounded-2xl p-6 border border-dark-600"
        >
          <div className="text-3xl mb-3">⏰</div>
          <h3 className="text-xl font-bold text-white mb-2">Temporizador</h3>
          <p className="text-gray-400 text-sm mb-4">Programa cuánto tiempo quieres enfocarte</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-semibold"
          >
            Configurar
          </motion.button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-dark-800 rounded-2xl p-6 border border-dark-600"
        >
          <div className="text-3xl mb-3">📝</div>
          <h3 className="text-xl font-bold text-white mb-2">Sesiones Guardadas</h3>
          <p className="text-gray-400 text-sm mb-4">Guarda tus combinaciones favoritas</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-white font-semibold"
          >
            Ver Guardados
          </motion.button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-dark-800 rounded-2xl p-6 border border-dark-600"
        >
          <div className="text-3xl mb-3">🎯</div>
          <h3 className="text-xl font-bold text-white mb-2">Modo Pomodoro</h3>
          <p className="text-gray-400 text-sm mb-4">25 min trabajo, 5 min descanso</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold"
          >
            Iniciar
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};
