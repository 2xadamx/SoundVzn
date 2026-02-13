import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchYouTubeMusic, YouTubeSearchResult, formatDuration, parseDuration } from '@utils/youtubeAPI';
import { searchSpotifyTracks, importSpotifyPlaylistFull } from '@utils/spotifyAPI';
import { searchUnifiedMultiSource } from '@utils/unifiedMusicAPI';

export const MusicSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [searchSource, setSearchSource] = useState<'all' | 'youtube' | 'spotify'>('all');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      let results: any[] = [];
      
      if (searchSource === 'youtube') {
        const ytResults = await searchYouTubeMusic(searchQuery, 30);
        results = ytResults.map(r => ({
          id: r.videoId,
          title: r.title,
          artist: r.artist,
          thumbnail: r.thumbnail,
          duration: parseDuration(r.duration),
          source: 'youtube',
          videoId: r.videoId,
        }));
      } else if (searchSource === 'spotify') {
        const spotifyResults = await searchSpotifyTracks(searchQuery, 30);
        results = spotifyResults.map(r => ({
          id: r.id,
          title: r.name,
          artist: r.artists.map(a => a.name).join(', '),
          thumbnail: r.album.images[0]?.url,
          duration: Math.floor(r.duration_ms / 1000),
          source: 'spotify',
          spotifyId: r.id,
          previewUrl: r.preview_url,
        }));
      } else {
        results = await searchUnifiedMultiSource(searchQuery);
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setImportStatus('❌ Error en la búsqueda');
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportSpotifyPlaylist = async () => {
    if (!spotifyUrl.trim()) return;

    setIsImporting(true);
    setImportStatus('🔄 Conectando con Spotify...');

    try {
      const playlist = await importSpotifyPlaylistFull(spotifyUrl);
      
      if (!playlist) {
        throw new Error('No se pudo importar la playlist');
      }

      setImportStatus(`✅ ${playlist.tracks.length} canciones encontradas en "${playlist.name}"`);
      
      console.log('Playlist importada:', playlist);

      setTimeout(() => {
        setImportStatus(`✅ Playlist "${playlist.name}" importada exitosamente!`);
      }, 2000);

    } catch (error) {
      setImportStatus('❌ Error al importar. Verifica el URL y tus credenciales de Spotify.');
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">Buscar Música</h1>
        <p className="text-gray-400">Encuentra cualquier canción del mundo</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-dark-800 rounded-2xl p-6 border border-dark-600"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-3xl">🔍</div>
            <div>
              <h2 className="text-xl font-bold text-white">Búsqueda Global</h2>
              <p className="text-sm text-gray-400">YouTube, Spotify y más</p>
            </div>
          </div>

          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Busca artista, canción, álbum..."
              className="w-full px-4 py-3 pl-12 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <div className="flex gap-2 mb-4">
            {(['all', 'youtube', 'spotify'] as const).map((source) => (
              <button
                key={source}
                onClick={() => setSearchSource(source)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  searchSource === source
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600 hover:text-white'
                }`}
              >
                {source === 'all' ? '🌐 Todos' : source === 'youtube' ? '📺 YouTube' : '🎵 Spotify'}
              </button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full py-3 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 rounded-lg text-white font-semibold disabled:opacity-50 transition-all"
          >
            {isSearching ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Buscando...
              </span>
            ) : (
              'Buscar Música'
            )}
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-green-900 to-green-700 rounded-2xl p-6 border border-green-600"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-3xl">🎵</div>
            <div>
              <h2 className="text-xl font-bold text-white">Importar de Spotify</h2>
              <p className="text-sm text-green-100">Pega el link de tu playlist</p>
            </div>
          </div>

          <div className="relative mb-4">
            <input
              type="text"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              className="w-full px-4 py-3 pl-12 bg-green-950/50 border border-green-600 rounded-lg text-white placeholder-green-300/50 focus:outline-none focus:border-green-400 transition-colors"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleImportSpotifyPlaylist}
            disabled={isImporting}
            className="w-full py-3 bg-white hover:bg-green-50 rounded-lg text-green-900 font-bold disabled:opacity-50 transition-all mb-3"
          >
            {isImporting ? 'Importando...' : 'Importar Playlist'}
          </motion.button>

          {importStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-950/50 border border-green-600 rounded-lg p-3 text-sm text-white"
            >
              {importStatus}
            </motion.div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-dark-800 rounded-2xl border border-dark-600 overflow-hidden"
          >
            <div className="p-6 border-b border-dark-700">
              <h2 className="text-2xl font-bold text-white">
                Resultados ({searchResults.length})
              </h2>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <motion.div
                  key={`${result.id}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ backgroundColor: '#1a1a1a' }}
                  className="flex items-center space-x-4 p-4 border-b border-dark-700 cursor-pointer transition-colors"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-dark-700">
                    {result.thumbnail ? (
                      <img
                        src={result.thumbnail}
                        alt={result.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🎵
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{result.title}</h3>
                    <p className="text-gray-400 text-sm truncate">{result.artist}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-dark-700 rounded-full text-xs font-semibold text-primary-400">
                      {result.source === 'youtube' ? '📺 YouTube' : 
                       result.source === 'spotify' ? '🎵 Spotify' : 
                       result.source === 'itunes' ? '🍎 iTunes' :
                       result.source === 'deezer' ? '🎶 Deezer' : 'Local'}
                    </span>

                    {result.duration && (
                      <span className="text-gray-500 text-sm">
                        {Math.floor(result.duration / 60)}:{(result.duration % 60).toString().padStart(2, '0')}
                      </span>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-700 flex items-center justify-center text-white"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {searchResults.length === 0 && !isSearching && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Busca tu música favorita
          </h3>
          <p className="text-gray-400">
            Encuentra canciones de YouTube, Spotify y más fuentes
          </p>
        </div>
      )}
    </div>
  );
};
