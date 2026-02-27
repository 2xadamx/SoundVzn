import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchEverything as searchUnified } from '@utils/unifiedMusicAPI';
import { usePlayerStore } from '@store/player';
import { Search, Mic2, Loader2, Play, Plus, MoreVertical, TrendingUp, History } from 'lucide-react';
import { Track, UnifiedTrackMetadata } from '../types';
import { PlaylistSelector } from './playlists/PlaylistSelector';
import { shallow } from 'zustand/shallow';

interface MusicSearchProps {
  onNavigate?: (view: string, params: any) => void;
}

type MixedResult = {
  type: 'track' | 'artist' | 'album';
  score: number;
  item: any;
  key: string;
};

const normalize = (t: string) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const scoreTrack = (track: any, query: string) => {
  const q = normalize(query);
  const title = normalize(track.title || '');
  const artist = normalize(track.artist || '');
  const qTokens = q.split(' ').filter(Boolean);
  const tokenHits = qTokens.filter((tk) => title.includes(tk) || artist.includes(tk)).length;
  let score = 0;
  if (`${title} ${artist}` === q) score += 180;
  if (title === q) score += 150;
  if (artist === q) score += 85;
  if (title.startsWith(q)) score += 70;
  if (title.includes(q)) score += 45;
  if (artist.includes(q)) score += 20;
  score += tokenHits * 10;
  // Popularity has strong weight to avoid obscure results on top.
  score += (track.popularity || 0) * 0.35;
  // Keep tracks above entities when query seems song-oriented.
  score += 18;
  return score;
};

const scoreArtist = (artist: any, query: string) => {
  const q = normalize(query);
  const name = normalize(artist.name || '');
  let score = 0;
  if (name === q) score += 110;
  if (name.startsWith(q)) score += 45;
  if (name.includes(q)) score += 20;
  score += (artist.popularity || 0) * 0.22;
  return score;
};

const scoreAlbum = (album: any, query: string) => {
  const q = normalize(query);
  const name = normalize(album.name || '');
  const artist = normalize(album.artist || '');
  let score = 0;
  if (`${name} ${artist}` === q) score += 95;
  if (name === q) score += 75;
  if (name.startsWith(q)) score += 40;
  if (name.includes(q)) score += 18;
  if (artist.includes(q)) score += 12;
  score += (album.popularity || 0) * 0.2;
  return score;
};

export const MusicSearch: React.FC<MusicSearchProps> = ({ onNavigate }) => {
  const { searchQuery, setSearchQuery, playUnifiedTrack } = usePlayerStore(
    (state) => ({
      searchQuery: state.searchQuery,
      setSearchQuery: state.setSearchQuery,
      playUnifiedTrack: state.playUnifiedTrack,
    }),
    shallow
  );
  const searchRequestRef = React.useRef(0);
  const [searchResults, setSearchResults] = useState<{ tracks: any[]; artists: any[]; albums: any[] }>({
    tracks: [],
    artists: [],
    albums: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults({ tracks: [], artists: [], albums: [] });
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const requestId = ++searchRequestRef.current;
    setIsSearching(true);
    try {
      const timeoutMs = 12000;
      const results = await Promise.race([
        searchUnified(searchQuery),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Search timeout')), timeoutMs)),
      ]);
      if (requestId !== searchRequestRef.current) return;
      setSearchResults(results as any);
    } catch (error) {
      if (requestId !== searchRequestRef.current) return;
      console.error('Search error:', error);
      setSearchResults({ tracks: [], artists: [], albums: [] });
    } finally {
      if (requestId === searchRequestRef.current) setIsSearching(false);
    }
  };

  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handlePlayTrack = async (result: UnifiedTrackMetadata) => {
    if (isLoadingTrack) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoadingTrack(true);
    try {
      await playUnifiedTrack(result);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Playback error:', error);
    } finally {
      setIsLoadingTrack(false);
    }
  };

  const mixedResults = React.useMemo<MixedResult[]>(() => {
    const query = searchQuery.trim();
    if (!query) return [];

    const tracks = (searchResults.tracks || []).map((item) => ({
      type: 'track' as const,
      score: scoreTrack(item, query),
      item,
      key: `t:${item.externalIds?.deezer || item.externalIds?.spotify || item.title}:${item.artist}`,
    }));

    const artists = (searchResults.artists || []).map((item) => ({
      type: 'artist' as const,
      score: scoreArtist(item, query),
      item,
      key: `a:${item.id || item.name}`,
    }));

    const albums = (searchResults.albums || []).map((item) => ({
      type: 'album' as const,
      score: scoreAlbum(item, query),
      item,
      key: `al:${item.id || item.name}:${item.artist || ''}`,
    }));

    const tracksSorted = [...tracks].sort((a, b) => b.score - a.score);
    const artistsSorted = [...artists].sort((a, b) => b.score - a.score);
    const albumsSorted = [...albums].sort((a, b) => b.score - a.score);

    // Spotify-like top block: 3 canciones + 3 artistas + 3 albumes.
    const topBlock: MixedResult[] = [
      ...tracksSorted.slice(0, 3),
      ...artistsSorted.slice(0, 3),
      ...albumsSorted.slice(0, 3),
    ];

    const topKeys = new Set(topBlock.map((r) => r.key));
    const rest = [...tracksSorted, ...artistsSorted, ...albumsSorted]
      .filter((r) => !topKeys.has(r.key))
      .sort((a, b) => b.score - a.score);

    return [...topBlock, ...rest].slice(0, 24);
  }, [searchResults, searchQuery]);

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-500 overflow-visible">
      <div className="relative group">
        <div className="absolute inset-0 bg-white/5 blur-2xl group-hover:bg-white/10 transition-all rounded-[32px]" />
        <div className="relative flex items-center gap-4 bg-white/5 backdrop-blur-2xl border border-white/10 p-2 pl-6 rounded-[32px] shadow-2xl transition-all group-focus-within:border-white/20">
          <Search className="text-white/40 group-focus-within:text-white transition-colors" size={24} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Que quieres escuchar hoy?"
            className="flex-1 bg-transparent border-none outline-none text-white text-xl font-bold placeholder:text-white/20 py-4 italic"
          />
          {isSearching ? (
            <div className="pr-6">
              <Loader2 className="animate-spin text-white/40" size={24} />
            </div>
          ) : (
            <button onClick={() => handleSearch()} className="bg-white text-black px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform">
              Buscar
            </button>
          )}
        </div>
      </div>

      {!isSearching && mixedResults.length > 0 ? (
        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight text-white/40">Resultados de búsqueda</h3>
            <div className="space-y-1">
              {mixedResults.map((row, index) => {
                const typeLabel = row.type === 'track' ? 'CANCION' : row.type === 'artist' ? 'ARTISTA' : 'ALBUM';
                const image = row.type === 'track' ? row.item.artwork?.medium || row.item.artwork?.large : row.item.image;
                const title = row.type === 'track' ? row.item.title : row.item.name;
                const subtitle = row.type === 'track' ? row.item.artist : row.type === 'artist' ? 'Perfil de artista' : row.item.artist || 'Album';

                const onClick = () => {
                  if (row.type === 'track') return handlePlayTrack(row.item);
                  if (row.type === 'artist') {
                    return onNavigate?.('artist', { artistName: row.item.name, artistId: row.item.id, from: 'search' });
                  }
                  return onNavigate?.('album', {
                    albumName: row.item.name,
                    artistName: row.item.artist,
                    albumId: row.item.id,
                    from: 'search',
                  });
                };

                return (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={onClick}
                    className="group flex items-center gap-4 p-4 rounded-3xl hover:bg-white/[0.05] border border-transparent hover:border-white/5 cursor-pointer transition-all"
                  >
                    <div className={`w-12 h-12 overflow-hidden shadow-lg ${row.type === 'artist' ? 'rounded-full' : 'rounded-xl'}`}>
                      <img
                        src={image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=800'}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-bold truncate tracking-tight">{title}</h4>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest truncate">{subtitle}</p>
                    </div>

                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 px-3 py-1 rounded-full border border-white/10">{typeLabel}</span>

                    {row.type === 'track' && (
                      <>
                        <button
                          disabled={isLoadingTrack}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(row.item);
                          }}
                          className={`p-2 rounded-full text-white/60 hover:text-white transition-all ${isLoadingTrack ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'}`}
                        >
                          {isLoadingTrack ? (
                            <Loader2 className="animate-spin" size={20} />
                          ) : (
                            <Play size={20} fill="currentColor" />
                          )}
                        </button>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrackForPlaylist(row.item);
                            }}
                            className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white"
                          >
                            <Plus size={20} />
                          </button>
                          <button className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white">
                            <MoreVertical size={20} />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        !isSearching &&
        !searchQuery && (
          <div className="py-20 flex flex-col items-center justify-center space-y-12">
            <div className="relative">
              <div className="absolute inset-0 bg-white/5 blur-[100px] rounded-full" />
              <Search size={80} className="text-white/10 animate-pulse relative" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 space-y-4">
                <TrendingUp className="text-primary" size={32} />
                <h4 className="text-white font-black uppercase tracking-widest">Tendencias</h4>
                <p className="text-white/40 text-[10px] uppercase font-bold leading-loose">Descubre lo que la comunidad SoundVizion esta escuchando ahora mismo.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 space-y-4">
                <Mic2 className="text-accent-blue" size={32} />
                <h4 className="text-white font-black uppercase tracking-widest">Artistas</h4>
                <p className="text-white/40 text-[10px] uppercase font-bold leading-loose">Explora perfiles detallados, discografias y biografias completas.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 space-y-4">
                <History className="text-accent-purple" size={32} />
                <h4 className="text-white font-black uppercase tracking-widest">Tu Historial</h4>
                <p className="text-white/40 text-[10px] uppercase font-bold leading-loose">Recupera tus busquedas recientes y viaja a tus temas favoritos.</p>
              </div>
            </div>
          </div>
        )
      )}

      <AnimatePresence>
        {selectedTrackForPlaylist && <PlaylistSelector track={selectedTrackForPlaylist} onClose={() => setSelectedTrackForPlaylist(null)} />}
      </AnimatePresence>
    </div>
  );
};
