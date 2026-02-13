import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@store/player';
import { EQ_FREQUENCIES, EQ_PRESETS, applyEQPreset, setEQGain, enableMobileOptimization } from '@utils/audioProcessor';

export const Equalizer: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof EQ_PRESETS>('flat');
  const [eqValues, setEqValues] = useState<number[]>(EQ_PRESETS.flat);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePresetChange = (preset: keyof typeof EQ_PRESETS) => {
    setSelectedPreset(preset);
    setEqValues(EQ_PRESETS[preset]);
    applyEQPreset(preset);
  };

  const handleBandChange = (index: number, value: number) => {
    const newValues = [...eqValues];
    newValues[index] = value;
    setEqValues(newValues);
    setEQGain(index, value);
    setSelectedPreset('flat');
  };

  const handleMobileOptimization = () => {
    enableMobileOptimization();
    setSelectedPreset('mobile_optimized');
    setEqValues(EQ_PRESETS.mobile_optimized);
  };

  const presets = Object.keys(EQ_PRESETS) as Array<keyof typeof EQ_PRESETS>;

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Ecualizador de 10 Bandas</h1>
        <p className="text-gray-400">Personaliza tu experiencia de audio profesional</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 cursor-pointer"
          onClick={() => handlePresetChange('audiophile')}
        >
          <div className="text-3xl mb-3">🎧</div>
          <h3 className="text-xl font-bold text-white mb-2">Audiófilo</h3>
          <p className="text-blue-100 text-sm">Respuesta plana premium para audiófilos</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 cursor-pointer"
          onClick={handleMobileOptimization}
        >
          <div className="text-3xl mb-3">📱</div>
          <h3 className="text-xl font-bold text-white mb-2">Optimizado Móvil</h3>
          <p className="text-purple-100 text-sm">EQ estratégico para speakers pequeños</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-green-600 to-teal-600 rounded-2xl p-6 cursor-pointer"
          onClick={() => handlePresetChange('bass_boost')}
        >
          <div className="text-3xl mb-3">🔊</div>
          <h3 className="text-xl font-bold text-white mb-2">Bass Boost</h3>
          <p className="text-green-100 text-sm">Graves potentes para géneros modernos</p>
        </motion.div>
      </div>

      <div className="bg-dark-800 rounded-2xl p-8 border border-dark-600 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Presets</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-semibold"
          >
            {showAdvanced ? 'Modo Simple' : 'Modo Avanzado'}
          </motion.button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {presets.map((preset) => (
            <motion.button
              key={preset}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePresetChange(preset)}
              className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                selectedPreset === preset
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-dark-700 text-gray-400 hover:bg-dark-600 hover:text-white'
              }`}
            >
              {preset.replace(/_/g, ' ').toUpperCase()}
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="flex items-end justify-between space-x-4 h-64">
                {EQ_FREQUENCIES.map((freq, index) => (
                  <div key={freq} className="flex-1 flex flex-col items-center">
                    <div className="h-full flex items-end mb-3">
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={eqValues[index]}
                        onChange={(e) => handleBandChange(index, parseFloat(e.target.value))}
                        orient="vertical"
                        className="h-48 cursor-pointer appearance-none bg-transparent [writing-mode:bt-lr] [-webkit-appearance:slider-vertical] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-runnable-track]:w-2 [&::-webkit-slider-runnable-track]:bg-dark-700 [&::-webkit-slider-runnable-track]:rounded-full"
                      />
                    </div>
                    
                    <div className="text-center">
                      <div className="text-primary-400 font-bold text-sm mb-1">
                        {eqValues[index] > 0 ? '+' : ''}{eqValues[index].toFixed(1)} dB
                      </div>
                      <div className="text-gray-500 text-xs font-semibold">
                        {freq >= 1000 ? `${freq / 1000}k` : freq}Hz
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-dark-900/50 rounded-xl p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Estado del EQ</span>
            <span className="text-green-400 font-semibold">● Activo</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
          <h3 className="text-lg font-bold text-white mb-4">Calidad de Audio</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Sample Rate:</span>
              <span className="text-white font-semibold">192 kHz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bit Depth:</span>
              <span className="text-white font-semibold">24-bit Float</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Latencia:</span>
              <span className="text-green-400 font-semibold">Ultra Baja</span>
            </div>
          </div>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
          <h3 className="text-lg font-bold text-white mb-4">Procesamiento DSP</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Compresor</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Limitador</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Upsampling</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
          <h3 className="text-lg font-bold text-white mb-4">Guardado Rápido</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-semibold mb-2"
          >
            Guardar Preset Actual
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-3 bg-dark-700 hover:bg-dark-600 rounded-lg text-white font-semibold"
          >
            Restaurar Default
          </motion.button>
        </div>
      </div>
    </div>
  );
};
