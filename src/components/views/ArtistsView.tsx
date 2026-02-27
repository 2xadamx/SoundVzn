import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ArtistsViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const ArtistsView: React.FC<ArtistsViewProps> = ({ onNavigate }) => {
  const [artists, setArtists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchArtists = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api-deezer/chart/0/tracks?limit=60');
        const data = await response.json();
        const unique = new Map<string, any>();
        for (const t of data?.data || []) {
          const a = t?.artist;
          if (!a?.id || unique.has(String(a.id))) continue;
          unique.set(String(a.id), {
            id: `deezer-artist:${a.id}`,
            name: a.name,
            image: a.picture_xl || a.picture_big || a.picture_medium,
          });
        }
        setArtists(Array.from(unique.values()).slice(0, 30));
      } catch (error) {
        console.error('Artists view error:', error);
        setArtists([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArtists();
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
      <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">Artistas</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {artists.map((artist, i) => (
          <motion.button
            key={artist.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.015 }}
            whileHover={{ y: -4 }}
            onClick={() => onNavigate('artist', { artistId: artist.id, artistName: artist.name, from: 'artists' })}
            className="text-left group"
          >
            <div className="w-full aspect-square rounded-full overflow-hidden border-4 border-white/10 group-hover:border-white/30 transition-all shadow-2xl">
              <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <p className="mt-3 text-sm font-bold text-white truncate text-center">{artist.name}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
