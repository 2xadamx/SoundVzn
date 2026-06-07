import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Play } from 'lucide-react';
import { toSentenceCase } from '../../utils/formatters';
import { BACKEND_URL } from '../../utils/apiConfig';

interface AlbumsViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const AlbumsView: React.FC<AlbumsViewProps> = ({ onNavigate }) => {
  const [albums, setAlbums] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlbums = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('svzn_token');
        const response = await fetch(`${BACKEND_URL}/api/deezer/chart/0/tracks?limit=80`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const unique = new Map<string, any>();
        for (const t of data?.data || []) {
          const a = t?.album;
          if (!a?.id || unique.has(String(a.id))) continue;
          unique.set(String(a.id), {
            id: `deezer-album:${a.id}`,
            name: a.title,
            artist: t?.artist?.name || '',
            image: a.cover_xl || a.cover_big || a.cover_medium,
          });
        }
        setAlbums(Array.from(unique.values()).slice(0, 36));
      } catch (error) {
        console.error('Albums view error:', error);
        setAlbums([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAlbums();
  }, []);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-white/50" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <div className="flex items-center gap-3 mb-0.5">
          <h1 className="text-xl font-semibold text-white tracking-tight">{toSentenceCase('Álbumes')}</h1>
          <span className="text-[13px] text-white/25">({albums.length})</span>
        </div>
        <p className="text-[11px] text-white/25 font-bold uppercase tracking-widest">{toSentenceCase('Tu colección de discos guardados')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {albums.map((album, i) => (
          <motion.button
            key={album.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.015 }}
            onClick={() => onNavigate('album', { albumId: album.id, albumName: album.name, artistName: album.artist, from: 'albums' })}
            className="text-left group relative"
          >
            <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-2 bg-white/[0.03] border border-white/[0.05] group-hover:border-white/20 transition-all duration-300">
              <img src={album.image} alt={album.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              
              {/* Play Overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform duration-300">
                  <Play size={16} fill="black" className="ml-1 text-black" />
                </div>
              </div>
            </div>
            
            <p className="text-[11px] font-bold text-white truncate leading-tight">{album.name}</p>
            <p className="text-[10px] font-medium text-white/30 truncate mt-1">{album.artist}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
