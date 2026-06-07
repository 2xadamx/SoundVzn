import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { searchEverything as searchUnified } from '@utils/unifiedMusicAPI';
import { usePlayerStore } from '@store/player';
import { Track, UnifiedTrackMetadata } from '../types';
import { PlaylistSelector } from './playlists/PlaylistSelector';
import { shallow } from 'zustand/shallow';
import { searchTracks as searchLocal } from '@utils/database';
import { getPalette } from '../utils/colorExtractor';
import {
  Search,
  Mic2,
  Loader2,
  Plus,
  MoreVertical,
  TrendingUp,
  SlidersHorizontal,
  Disc
} from 'lucide-react';

interface MusicSearchProps {
  onNavigate?: (view: string, params?: any) => void;
}

type MixedResult = {
  type: 'track' | 'artist' | 'album' | 'user';
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
  score += (track.popularity || 0) * 0.35;
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
  const [searchResults, setSearchResults] = useState<{ tracks: any[]; artists: any[]; albums: any[]; users: any[] }>({
    tracks: [],
    artists: [],
    albums: [],
    users: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    format: string[];
    minYear?: number;
    maxYear?: number;
    minBitrate?: number;
  }>({
    format: [],
  });

  const [topResultPalette, setTopResultPalette] = useState<any>(null);

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults({ tracks: [], artists: [], albums: [], users: [] });
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
      const [globalResults, localResults, userResults] = await Promise.all([
        Promise.race([
          searchUnified(searchQuery),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Search timeout')), timeoutMs)),
        ]).catch(() => ({ tracks: [], artists: [], albums: [] })),
        searchLocal(searchQuery, filters).catch(() => []),
        fetch(`${import.meta.env?.VITE_BACKEND_URL || 'http://localhost:3000'}/api/social/search?q=${encodeURIComponent(searchQuery)}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('svzn_token')}` }
        }).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      if (requestId !== searchRequestRef.current) return;

      const unifiedResults = {
        tracks: [...localResults, ...(globalResults.tracks || [])],
        artists: globalResults.artists || [],
        albums: globalResults.albums || [],
        users: userResults || [],
      };

      setSearchResults(unifiedResults as any);
      
      // REINFORCEMENT: Update Recent Searches
      const recent = JSON.parse(localStorage.getItem('svzn_recent_searches') || '[]');
      const updated = [searchQuery, ...recent.filter((s: string) => s !== searchQuery)].slice(0, 5);
      localStorage.setItem('svzn_recent_searches', JSON.stringify(updated));
    } catch (error) {
      if (requestId !== searchRequestRef.current) return;
      console.error('Search error:', error);
      setSearchResults({ tracks: [], artists: [], albums: [], users: [] });
    } finally {
      if (requestId === searchRequestRef.current) setIsSearching(false);
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

    const users = (searchResults.users || []).map((item) => ({
      type: 'user' as const,
      score: 100, // Fixed score for users for now
      item,
      key: `u:${item.id}`,
    }));

    const topBlock: MixedResult[] = [
      ...tracksSorted.slice(0, 3),
      ...artistsSorted.slice(0, 3),
      ...albumsSorted.slice(0, 3),
      ...users.slice(0, 3),
    ];

    const topKeys = new Set(topBlock.map((r) => r.key));
    const rest = [...tracksSorted, ...artistsSorted, ...albumsSorted]
      .filter((r) => !topKeys.has(r.key))
      .sort((a, b) => b.score - a.score);

    return [...topBlock, ...rest].slice(0, 24);
  }, [searchResults, searchQuery]);

  useEffect(() => {
    const top = mixedResults[0];
    if (!top) {
      setTopResultPalette(null);
      return;
    }
    const img = top.type === 'track' ? (top.item.artwork?.medium || top.item.artwork?.large) : top.item.image;
    if (img) {
      getPalette(img).then(p => setTopResultPalette(p)).catch(() => setTopResultPalette(null));
    } else {
      setTopResultPalette(null);
    }
  }, [mixedResults[0]?.key]);

  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handlePlayTrack = async (result: UnifiedTrackMetadata) => {
    if (isLoadingTrack) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
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

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-500 overflow-visible">
      {/* Search Bar — compact */}
      <div className="relative group max-w-3xl mx-auto pt-8">
        <div className="relative flex items-center gap-3 bg-black/30 backdrop-blur-2xl border border-white/6 p-2 pl-5 rounded-full shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition-all group-focus-within:border-white/10 group-focus-within:bg-black/50">
          <Search className="text-white/20 group-focus-within:text-white/50 transition-colors flex-shrink-0" size={18} strokeWidth={2} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar artistas, canciones, álbumes..."
            className="flex-1 bg-transparent border-none outline-none text-white text-base font-semibold placeholder:text-white/15 py-2.5"
          />
          {isSearching ? (
            <div className="pr-4">
              <Loader2 className="animate-spin text-white/30" size={18} />
            </div>
          ) : (
            <div className="flex items-center gap-2 pr-1">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${
                  showFilters || Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : !!v)
                    ? 'bg-white/15 border-white/20 text-white'
                    : 'bg-white/5 border-white/5 text-white/20 hover:text-white/60'
                }`}
              >
                <SlidersHorizontal size={15} />
              </button>
              <button
                onClick={() => handleSearch()}
                className="bg-white text-black px-6 h-9 rounded-full font-black tracking-[0.15em] text-[11px] hover:scale-105 transition-all active:scale-95 shadow-lg uppercase"
              >
                BUSCAR
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Searches - Pro Detail */}
      {!searchQuery && (
        <div className="max-w-3xl mx-auto px-4 mt-8">
            <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Búsquedas Recientes</h4>
            <div className="flex flex-wrap gap-2">
                {JSON.parse(localStorage.getItem('svzn_recent_searches') || '[]').map((s: string) => (
                    <button 
                        key={s}
                        onClick={() => setSearchQuery(s)}
                        className="px-4 py-2 bg-white/5 border border-white/5 rounded-full text-xs text-white/60 hover:bg-white/10 hover:border-white/10 transition-all"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
      )}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-4"
          >
            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Formato de audio</h4>
                <div className="flex flex-wrap gap-2">
                  {['MP3', 'FLAC', 'WAV', 'M4A'].map(f => (
                    <button
                      key={f}
                      onClick={() => {
                        const newF = filters.format.includes(f) ? filters.format.filter(x => x !== f) : [...filters.format, f];
                        setFilters({ ...filters, format: newF });
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold border transition-all ${filters.format.includes(f) ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Rango de años</h4>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minYear || ''}
                    onChange={e => setFilters({ ...filters, minYear: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxYear || ''}
                    onChange={e => setFilters({ ...filters, maxYear: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Calidad</h4>
                <select
                  value={filters.minBitrate || 0}
                  onChange={e => setFilters({ ...filters, minBitrate: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none appearance-none"
                >
                  <option value={0}>Cualquier Calidad</option>
                  <option value={128}>128 kbps+</option>
                  <option value={256}>256 kbps+</option>
                  <option value={320}>320 kbps (HQ)</option>
                  <option value={800}>800 kbps (Lossless)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultados Section */}
      {!isSearching && mixedResults.length > 0 ? (
        <div className="space-y-12">
          {/* Top Result - Pro Highlight */}
          {mixedResults[0] && (
            <section className="space-y-6">
               <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.3em] px-4">Resultado Destacado</h3>
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 onClick={() => {
                   const top = mixedResults[0];
                   if (top.type === 'track') return handlePlayTrack(top.item);
                   if (top.type === 'artist') return onNavigate?.('artist', { artistName: top.item.name, artistId: top.item.id, from: 'search' });
                   if (top.type === 'user') return onNavigate?.('profile', { userId: top.item.id });
                   return onNavigate?.('album', { albumName: top.item.name, artistName: top.item.artist, albumId: top.item.id, from: 'search' });
                 }}
                 style={{
                   background: topResultPalette 
                       ? `linear-gradient(135deg, ${topResultPalette.primary}99 0%, ${topResultPalette.secondary || topResultPalette.primary}44 100%)`
                       : 'rgba(255,255,255,0.03)',
                   borderColor: topResultPalette ? `${topResultPalette.primary}55` : 'rgba(255,255,255,0.05)',
                   boxShadow: topResultPalette ? `0 20px 60px -10px ${topResultPalette.primary}44` : 'none'
                 }}
                 className="group relative overflow-hidden p-8 rounded-[32px] border transition-all cursor-pointer max-w-2xl"
               >
                 {/* Solid Color Background Layer for more uniform look */}
                 {topResultPalette && (
                    <div 
                      className="absolute inset-0 opacity-20 pointer-events-none transition-colors duration-1000"
                      style={{ backgroundColor: topResultPalette.primary }}
                    />
                 )}

                 <div className="flex items-center gap-8 relative z-10">
                    <div className={clsx(
                        "w-36 h-36 shadow-xl overflow-hidden border border-white/20 flex-shrink-0",
                        (mixedResults[0].type === 'artist' || mixedResults[0].type === 'user') ? "rounded-full" : "rounded-2xl"
                    )}>
                        <img 
                            src={mixedResults[0].type === 'track' ? (mixedResults[0].item.artwork?.medium || mixedResults[0].item.artwork?.large) : (mixedResults[0].item.image || mixedResults[0].item.avatar) || 'https://api.dicebear.com/9.x/thumbs/svg?seed=' + mixedResults[0].item.name} 
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                            alt=""
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black tracking-[0.3em] text-white/50 uppercase mb-2 block">
                            {mixedResults[0].type === 'track' ? 'Canción' : mixedResults[0].type === 'artist' ? 'Artista' : mixedResults[0].type === 'user' ? 'Usuario' : 'Álbum'}
                        </span>
                        <h2 className="text-4xl font-black text-white mb-2 truncate tracking-tight leading-tight drop-shadow-md">
                            {mixedResults[0].type === 'track' ? mixedResults[0].item.title : mixedResults[0].item.name}
                        </h2>
                        <p className="text-lg text-white/80 font-bold tracking-tight truncate drop-shadow-sm">
                            {mixedResults[0].type === 'track' ? mixedResults[0].item.artist : mixedResults[0].type === 'user' ? `@${mixedResults[0].item.username}` : 'Perfil de artista'}
                        </p>
                    </div>
                 </div>
               </motion.div>
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.3em] px-4">Más Resultados</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {mixedResults.slice(1).map((row, index) => {
                const typeLabel = row.type === 'track' ? 'Canción' : row.type === 'artist' ? 'Artista' : 'Álbum';
                const image = row.type === 'track' ? row.item.artwork?.medium || row.item.artwork?.large : row.item.image;
                const title = row.type === 'track' ? row.item.title : row.item.name;
                const subtitle = row.type === 'track' ? row.item.artist : row.type === 'artist' ? 'Perfil de artista' : row.item.artist || 'Album';

                const handleClick = () => {
                  if (row.type === 'track') return handlePlayTrack(row.item);
                  if (row.type === 'artist') return onNavigate?.('artist', { artistName: row.item.name, artistId: row.item.id, from: 'search' });
                  if (row.type === 'user') return onNavigate?.('profile', { userId: row.item.id });
                  return onNavigate?.('album', { albumName: row.item.name, artistName: row.item.artist, albumId: row.item.id, from: 'search' });
                };

                return (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={handleClick}
                    className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.05] border border-transparent hover:border-white/5 cursor-pointer transition-all"
                  >
                    <div className={`w-12 h-12 overflow-hidden shadow-lg ${row.type === 'artist' ? 'rounded-full' : 'rounded-lg'}`}>
                      <img
                        src={image || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=800'}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{title}</h4>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider truncate">{subtitle}</p>
                    </div>
                    <span className="text-[10px] font-black tracking-widest text-white/20 whitespace-nowrap uppercase">{typeLabel}</span>
                    {row.type === 'track' && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedTrackForPlaylist(row.item); }}
                          className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                          title="Añadir a playlist"
                        >
                          <Plus size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Reproducir directamente al hacer click en el menú
                            handlePlayTrack(row.item);
                          }}
                          className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                          title="Reproducir"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        !isSearching && !searchQuery && (
          <div className="py-20 flex flex-col items-center justify-center space-y-12">
            <div className="relative">
              <div className="absolute inset-0 bg-white/5 blur-[80px] rounded-full" />
              <Search size={48} className="text-white/10 relative" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 space-y-4 group hover:bg-white/[0.08] transition-all">
                <TrendingUp className="text-primary" size={32} />
                <h4 className="text-white font-black tracking-widest">Tendencias</h4>
                <p className="text-white/40 text-[10px] font-bold leading-loose">Descubre lo que la comunidad SoundVizion está escuchando ahora mismo.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 space-y-4 group hover:bg-white/[0.08] transition-all">
                <Mic2 className="text-accent-blue" size={32} />
                <h4 className="text-white font-black tracking-widest">Artistas</h4>
                <p className="text-white/40 text-[10px] font-bold leading-loose">Explora perfiles detallados, discografías y biografías completas.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 space-y-4 group hover:bg-white/[0.08] transition-all">
                <Disc className="text-accent-purple" size={32} />
                <h4 className="text-white font-black tracking-widest">Álbumes</h4>
                <p className="text-white/40 text-[10px] font-bold leading-loose">Colecciona y escucha tus álbumes favoritos en alta fidelidad.</p>
              </div>
            </div>
          </div>
        )
      )}

      <AnimatePresence>
        {selectedTrackForPlaylist && (
          <PlaylistSelector track={selectedTrackForPlaylist} onClose={() => setSelectedTrackForPlaylist(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};
