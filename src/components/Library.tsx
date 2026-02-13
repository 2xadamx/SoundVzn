import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibraryStore } from '@store/library';
import { usePlayerStore } from '@store/player';
import { extractMetadata } from '@utils/metadata';
import { addTrack, getAllTracks } from '@utils/database';
import { Track } from '@types/index';

export const Library: React.FC = () => {
  const { tracks, isLoading, searchQuery, setSearchQuery, getFilteredTracks, setTracks, setLoading } = useLibraryStore();
  const { setCurrentTrack, setQueue, setIsPlaying } = usePlayerStore();
  const filteredTracks = getFilteredTracks();

  useEffect(() => {
    const loadTracks = async () => {
      setLoading(true);
      try {
        const dbTracks = await getAllTracks();
        setTracks(dbTracks);
      } catch (error) {
        console.error('Error loading tracks:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTracks();
  }, [setTracks, setLoading]);

  const handleImportMusic = async () => {
    try {
      const filePaths = await window.electron.openFile();
      if (!filePaths || filePaths.length === 0) return;

      setLoading(true);

      for (const filePath of filePaths) {
        try {
          // Skip if already exists (simple check)
          if (tracks.some(t => t.filePath === filePath)) continue;

          const metadata = await extractMetadata(filePath);

          const newTrack: Track = {
            id: crypto.randomUUID(),
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            duration: metadata.duration,
            filePath: filePath,
            format: metadata.format,
            bitrate: metadata.bitrate,
            sampleRate: metadata.sampleRate,
            bitDepth: metadata.bitDepth,
            year: metadata.year,
            genre: metadata.genre,
            artwork: metadata.artwork,
            addedDate: new Date(),
            playCount: 0,
            lastPlayed: undefined
          };

          await addTrack(newTrack);
        } catch (err) {
          console.error(`Failed to import ${filePath}:`, err);
        }
      }

      // Refresh list
      const updatedTracks = await getAllTracks();
      setTracks(updatedTracks);
    } catch (error) {
      console.error('Error importing music:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = (track: any) => {
    setCurrentTrack(track);
    setQueue(filteredTracks);
    setIsPlaying(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Biblioteca Musical</h1>
            <p className="text-gray-400 mt-1">{tracks.length} canciones</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleImportMusic}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            <span>Importar Música</span>
          </motion.button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar canciones, artistas, álbumes..."
            className="w-full px-4 py-3 pl-12 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
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
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-24 h-24 rounded-full bg-dark-800 flex items-center justify-center text-5xl mb-4">
              🎵
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Tu biblioteca está vacía</h3>
            <p className="text-gray-400 mb-6 max-w-md">
              Importa tu música para comenzar a disfrutar de audio de alta calidad
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleImportMusic}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-semibold"
            >
              Importar Música
            </motion.button>
          </div>
        ) : (
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-dark-700">
                  <th className="pb-3 pl-4">#</th>
                  <th className="pb-3">Título</th>
                  <th className="pb-3">Artista</th>
                  <th className="pb-3">Álbum</th>
                  <th className="pb-3">Duración</th>
                  <th className="pb-3">Formato</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredTracks.map((track, index) => (
                    <motion.tr
                      key={track.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => handlePlayTrack(track)}
                      className="border-b border-dark-800 hover:bg-dark-800 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 pl-4 text-gray-500 group-hover:text-primary-500">
                        {index + 1}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-white">{track.title}</div>
                      </td>
                      <td className="py-3 text-gray-400">{track.artist}</td>
                      <td className="py-3 text-gray-400">{track.album}</td>
                      <td className="py-3 text-gray-400">
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-1 bg-dark-700 rounded text-xs font-mono text-primary-400">
                          {track.format?.toUpperCase() || 'MP3'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
