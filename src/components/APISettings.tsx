import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { testAPIConnections, updateAPIConfig, getAPIConfig } from '@utils/apiConfig';
import { getCacheStats, clearOldCache } from '@utils/cacheManager';
import { enrichAllLocalTracks } from '@utils/autoEnrich';

export const APISettings: React.FC = () => {
  const [apiStatus, setApiStatus] = useState({
    spotify: false,
    lastfm: false,
    audd: false,
    itunes: true,
    musicbrainz: true,
    deezer: true,
  });

  const [config, setConfig] = useState({
    spotifyClientId: '',
    spotifyClientSecret: '',
    lastfmApiKey: '',
    auddApiKey: '',
  });

  const [cacheStats, setCacheStats] = useState({
    searchCount: 0,
    metadataCount: 0,
    artworkCount: 0,
  });

  const [isEnriching, setIsEnriching] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadConfig();
    testConnections();
    loadCacheStats();
  }, []);

  const loadConfig = () => {
    const saved = getAPIConfig();
    setConfig({
      spotifyClientId: saved.spotify.clientId,
      spotifyClientSecret: saved.spotify.clientSecret,
      lastfmApiKey: saved.lastfm.apiKey,
      auddApiKey: saved.audd.apiKey,
    });
  };

  const loadCacheStats = async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
  };

  const testConnections = async () => {
    setIsTesting(true);
    const status = await testAPIConnections();
    setApiStatus(status);
    setIsTesting(false);
  };

  const handleSave = () => {
    updateAPIConfig({
      spotify: {
        clientId: config.spotifyClientId,
        clientSecret: config.spotifyClientSecret,
        enabled: false,
      },
      lastfm: {
        apiKey: config.lastfmApiKey,
        secret: '',
        enabled: false,
      },
      audd: {
        apiKey: config.auddApiKey,
        enabled: false,
      },
    });

    alert('✅ Configuración guardada! Probando conexiones...');
    testConnections();
  };

  const handleEnrichLibrary = async () => {
    if (!confirm('¿Enriquecer toda la biblioteca con metadata online? Esto puede tardar varios minutos.')) {
      return;
    }

    setIsEnriching(true);
    try {
      await enrichAllLocalTracks();
      alert('✅ Biblioteca enriquecida exitosamente!');
    } catch (error) {
      alert('❌ Error al enriquecer biblioteca');
    } finally {
      setIsEnriching(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('¿Limpiar caché antigua? Esto eliminará datos de más de 7 días.')) {
      return;
    }

    await clearOldCache();
    await loadCacheStats();
    alert('✅ Caché limpiado!');
  };

  const apiServices = [
    {
      name: 'Spotify',
      key: 'spotify',
      description: 'Metadata + Previews',
      status: apiStatus.spotify,
      free: 'Gratis',
      color: 'from-green-600 to-green-800',
    },
    {
      name: 'iTunes',
      key: 'itunes',
      description: 'Metadata + Artwork HD',
      status: apiStatus.itunes,
      free: '100% Gratis',
      color: 'from-blue-600 to-blue-800',
    },
    {
      name: 'Deezer',
      key: 'deezer',
      description: 'Metadata + Previews',
      status: apiStatus.deezer,
      free: '100% Gratis',
      color: 'from-orange-600 to-orange-800',
    },
    {
      name: 'MusicBrainz',
      key: 'musicbrainz',
      description: 'Open Source DB',
      status: apiStatus.musicbrainz,
      free: '100% Gratis',
      color: 'from-purple-600 to-purple-800',
    },
    {
      name: 'Last.fm',
      key: 'lastfm',
      description: 'Scrobbling + Stats',
      status: apiStatus.lastfm,
      free: 'API Key Gratis',
      color: 'from-red-600 to-red-800',
    },
    {
      name: 'AudD',
      key: 'audd',
      description: 'Music Recognition',
      status: apiStatus.audd,
      free: '100/día gratis',
      color: 'from-pink-600 to-pink-800',
    },
  ];

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Configuración de APIs</h1>
        <p className="text-gray-400">Conecta con bases de datos masivas de música</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {apiServices.map((service) => (
          <motion.div
            key={service.key}
            whileHover={{ scale: 1.02 }}
            className={`bg-gradient-to-br ${service.color} rounded-xl p-4 border border-white/20`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">{service.name}</h3>
              <div className={`w-3 h-3 rounded-full ${service.status ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            </div>
            <p className="text-white/80 text-sm mb-2">{service.description}</p>
            <span className="inline-block px-2 py-1 bg-white/20 rounded text-xs font-semibold text-white">
              {service.free}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <h2 className="text-2xl font-bold text-white mb-6">🎵 Spotify API</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={config.spotifyClientId}
                onChange={(e) => setConfig({ ...config, spotifyClientId: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={config.spotifyClientSecret}
                onChange={(e) => setConfig({ ...config, spotifyClientSecret: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <a
            href="https://developer.spotify.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white text-center font-semibold mb-2"
          >
            Obtener Credenciales Spotify
          </a>
        </div>

        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <h2 className="text-2xl font-bold text-white mb-6">🎸 Last.fm API</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                API Key
              </label>
              <input
                type="text"
                value={config.lastfmApiKey}
                onChange={(e) => setConfig({ ...config, lastfmApiKey: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                AudD API Key (Opcional)
              </label>
              <input
                type="text"
                value={config.auddApiKey}
                onChange={(e) => setConfig({ ...config, auddApiKey: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <a
            href="https://www.last.fm/api/account/create"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white text-center font-semibold mb-2"
          >
            Obtener API Key Last.fm
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          className="px-8 py-4 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-bold"
        >
          💾 Guardar Configuración
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={testConnections}
          disabled={isTesting}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold disabled:opacity-50"
        >
          {isTesting ? '⏳ Probando...' : '🔍 Probar Conexiones'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEnrichLibrary}
          disabled={isEnriching}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold disabled:opacity-50"
        >
          {isEnriching ? '⏳ Enriqueciendo...' : '✨ Enriquecer Biblioteca'}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
          <h3 className="text-lg font-bold text-white mb-4">📊 Estadísticas de Caché</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Búsquedas:</span>
              <span className="text-white font-semibold">{cacheStats.searchCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Metadata:</span>
              <span className="text-white font-semibold">{cacheStats.metadataCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Artwork:</span>
              <span className="text-white font-semibold">{cacheStats.artworkCount}</span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClearCache}
            className="w-full mt-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold"
          >
            🗑️ Limpiar Caché
          </motion.button>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
          <h3 className="text-lg font-bold text-white mb-4">✨ Auto-Enriquecimiento</h3>
          <p className="text-gray-400 text-sm mb-4">
            Automáticamente busca metadata online para tus canciones locales y descarga artwork en HD.
          </p>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>✅ Matching inteligente</li>
            <li>✅ ISRC lookup</li>
            <li>✅ Artwork HD</li>
            <li>✅ Caché 7 días</li>
          </ul>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-dark-600">
          <h3 className="text-lg font-bold text-white mb-4">🌐 APIs Gratuitas</h3>
          <p className="text-gray-400 text-sm mb-4">
            iTunes, Deezer y MusicBrainz funcionan sin API keys. Spotify y Last.fm requieren registro gratuito.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">iTunes:</span>
              <span className="text-green-400">✓ Activo</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Deezer:</span>
              <span className="text-green-400">✓ Activo</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">MusicBrainz:</span>
              <span className="text-green-400">✓ Activo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
