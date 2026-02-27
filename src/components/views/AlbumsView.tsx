import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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
        const response = await fetch('/api-deezer/chart/0/tracks?limit=80');
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
    <div className="space-y-8 pb-24">
      <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">Álbumes</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {albums.map((album, i) => (
          <motion.button
            key={album.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.015 }}
            whileHover={{ y: -4 }}
            onClick={() => onNavigate('album', { albumId: album.id, albumName: album.name, artistName: album.artist, from: 'albums' })}
            className="text-left group"
          >
            <div className="w-full aspect-square rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/30 transition-all shadow-2xl">
              <img src={album.image} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <p className="mt-3 text-sm font-bold text-white truncate">{album.name}</p>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest truncate">{album.artist}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
