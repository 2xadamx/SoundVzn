import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Play } from 'lucide-react';
import { normalizeArtistName, toSentenceCase } from '../../utils/formatters';
import { BACKEND_URL } from '../../utils/apiConfig';

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
        const token = localStorage.getItem('svzn_token');
        const response = await fetch(`${BACKEND_URL}/api/deezer/chart/0/tracks?limit=60`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
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
      <h1 className="text-5xl font-black text-white tracking-tighter">{toSentenceCase('Artistas')}</h1>
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
            <div className="w-full aspect-square rounded-full overflow-hidden border-4 border-white/10 group-hover:border-white/30 transition-all shadow-2xl relative">
              <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black shadow-xl scale-90 group-hover:scale-100 transition-transform">
                  <Play size={20} fill="currentColor" />
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm font-black text-white truncate text-center tracking-tight">{normalizeArtistName(artist.name)}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
