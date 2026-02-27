import { create } from 'zustand';
import { Track, AudioSettings, EQSettings, ThemeConfig, PlaybackContext } from '../types';
import { toggleFavorite as dbToggleFavorite, updatePlayCount, addTrack } from '../utils/database';
import { setNetworkOffline } from '@utils/networkGuard';
import { notificationService } from '@services/notificationService';

const FIRST_PLAY_ACHIEVEMENT_KEY = 'soundvzn_first_play_achievement';

let discoveryInFlight = false;
let playNextInFlight = false;


const isPlayableTrack = (track: Track | null | undefined) =>
  !!track && !!track.id && !!track.filePath && typeof track.filePath === 'string';
const RECENT_HASH_LIMIT = 200;
const recentPlayedHashes: string[] = [];
const recentPlayedTracks: Track[] = [];

function normalizeTrackName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\[.*?\]/g, ' ')
    .replace(/\bfeat\.?.*/g, ' ')
    .replace(/\b(ft|featuring)\b.*/g, ' ')
    .replace(/\b(remix|live|acoustic|version|edit|radio edit)\b/g, ' ')
    .replace(/\b(audio|official|oficial|video|visualizer|lyrics|lyric|topic)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArtistName(name: string): string {
  return (name || '')
    .toLowerCase()
    .split(/,|&| y | and | x /)[0]
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trackHash(track: Pick<Track, 'title' | 'artist' | 'album'>): string {
  return `${normalizeTrackName(track.title)}|${normalizeArtistName(track.artist)}`;
}

async function rememberPlayed(track: Track | null | undefined) {
  if (!track) return;
  const hash = trackHash(track);
  if (!hash || hash === '|') return;

  if (typeof window !== 'undefined' && !localStorage.getItem(FIRST_PLAY_ACHIEVEMENT_KEY)) {
    localStorage.setItem(FIRST_PLAY_ACHIEVEMENT_KEY, '1');
    notificationService.achievementFirstPlay();
  }

  // In-memory update for fast access
  if (!recentPlayedHashes.includes(hash)) {
    recentPlayedHashes.push(hash);
    recentPlayedTracks.push({ ...track });
    if (recentPlayedHashes.length > RECENT_HASH_LIMIT) {
      recentPlayedHashes.splice(0, recentPlayedHashes.length - RECENT_HASH_LIMIT);
      recentPlayedTracks.splice(0, recentPlayedTracks.length - RECENT_HASH_LIMIT);
    }
  }

  // Persistent Database update (History)
  try {
    await addTrack(track);
    await updatePlayCount(track.id);
    console.log(`[Store] Track persisted to history: ${track.title}`);
  } catch (err) {
    console.error('[Store] Failed to persist history:', err);
  }
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  audioSettings: AudioSettings;
  eqSettings: EQSettings;
  theme: ThemeConfig;
  seekTo: number | null;
  isLyricsOpen: boolean;
  searchQuery: string;
  scrobbled: boolean;
  discoveryMode: boolean;
  isResolving: boolean;
  playbackContext: PlaybackContext | null;
  analyser: AnalyserNode | null;

  // Supreme Pro State
  appearance: 'stellar-dark' | 'radiant-light' | 'vivid-nebula';
  language: 'es' | 'en' | 'fr' | 'de';
  streamingQuality: 'normal' | 'cd' | 'hi-res';
  dataSaver: boolean;
  offlineMode: boolean;
  sleepTimer: number | null;

  setAnalyser: (analyser: AnalyserNode | null) => void;
  setPlaybackContext: (context: PlaybackContext | null) => void;
  setIsResolving: (val: boolean) => void;

  setCurrentTrack: (track: Track | null) => void;
  setQueue: (queue: Track[]) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setSeekTo: (time: number | null) => void;
  setCurrentIndex: (index: number) => void;
  setIsLyricsOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;
  toggleMute: () => void;

  // Supreme Pro Actions
  setAppearance: (appearance: 'stellar-dark' | 'radiant-light' | 'vivid-nebula') => void;
  setLanguage: (lang: 'es' | 'en' | 'fr' | 'de') => void;
  setStreamingQuality: (quality: 'normal' | 'cd' | 'hi-res') => void;
  setDataSaver: (enabled: boolean) => void;
  setOfflineMode: (enabled: boolean) => void;
  setSleepTimer: (minutes: number | null) => void;

  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleFavorite: (track?: any, forceState?: boolean) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  playTrackFromQueue: (index: number) => Promise<void>;
  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
  updateEQSettings: (settings: Partial<EQSettings>) => void;
  updateTheme: (theme: Partial<ThemeConfig>) => void;
  checkScrobble: () => void;
  playUnifiedTrack: (metadata: any, context?: PlaybackContext) => Promise<void>;
  playUnifiedCollection: (metadataList: any[], startIndex?: number, context?: PlaybackContext) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: 'off',
  seekTo: null,
  audioSettings: {
    volume: 0.8,
    muted: false,
    sampleRate: 48000,
    bitDepth: 24,
    exclusiveMode: false,
    replayGain: false,
    crossfade: 0,
  },
  eqSettings: {
    enabled: false,
    preset: 'flat',
    bands: Array.from({ length: 10 }, (_, i) => ({
      frequency: 32 * Math.pow(2, i),
      gain: 0,
      q: 1,
    })),
  },
  theme: {
    mode: 'dark',
    accentColor: '#0ea5e9',
    albumArtBlur: true,
    animations: true,
  },
  isLyricsOpen: false,
  searchQuery: '',
  scrobbled: false,
  discoveryMode: true,
  isResolving: false,
  playbackContext: null,
  analyser: null,

  // Appearance Pro Settings
  appearance: (localStorage.getItem('theme') as any) || 'stellar-dark',
  language: (localStorage.getItem('lang') as any) || 'es',
  streamingQuality: (localStorage.getItem('audio_quality') as any) || 'hi-res',
  dataSaver: localStorage.getItem('data_saver') === 'true',
  offlineMode: false,
  sleepTimer: null,

  setAnalyser: (analyser) => set({ analyser }),
  setPlaybackContext: (context) => set({ playbackContext: context }),
  setIsResolving: (val) => set({ isResolving: val }),

  // Supreme Pro Actions
  setAppearance: (appearance) => {
    set({ appearance });
    localStorage.setItem('theme', appearance);
    document.documentElement.setAttribute('data-theme', appearance);
    if (appearance === 'radiant-light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  },
  setLanguage: (language) => {
    set({ language });
    localStorage.setItem('lang', language);
  },
  setStreamingQuality: (streamingQuality) => {
    set({ streamingQuality });
    localStorage.setItem('audio_quality', streamingQuality);
  },
  setDataSaver: (dataSaver) => {
    set({ dataSaver });
    localStorage.setItem('data_saver', String(dataSaver));
  },
  setOfflineMode: (offlineMode) => {
    set({ offlineMode });
    setNetworkOffline(offlineMode);
    notificationService.offlineToggled(offlineMode);
  },
  setSleepTimer: (minutes) => {
    set({ sleepTimer: minutes });
    if (minutes === 0) set({ isPlaying: false, sleepTimer: null });
  },

  setCurrentTrack: (track) => {
    rememberPlayed(track);
    // Auto-register track in DB for history and easier favorites
    if (track?.id) {
      addTrack(track).then(() => {
        updatePlayCount(track.id).catch(() => { });
      }).catch(() => { });
    }
    set({ currentTrack: track, scrobbled: false, currentTime: 0 });
  },
  setQueue: (queue) => set({ queue }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume, audioSettings: { ...get().audioSettings, volume } }),
  setSeekTo: (time) => set({ seekTo: time }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setIsLyricsOpen: (isOpen) => set({ isLyricsOpen: isOpen }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleMute: () => set((state) => ({ muted: !state.muted })),
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
  toggleRepeat: () => set((state) => ({
    repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off',
  })),

  toggleFavorite: async (track?: any, forceState?: boolean) => {
    const { currentTrack, queue } = get();
    const target = track || currentTrack;
    if (!target) return;

    const isCurrent = target.id === currentTrack?.id;
    const newFav = typeof forceState === 'boolean' ? forceState : !target.favorite;
    const updatedTrack = { ...target, favorite: newFav };

    if (isCurrent) set({ currentTrack: updatedTrack });

    const trackIdx = queue.findIndex(t => t.id === target.id);
    if (trackIdx !== -1) {
      const newQueue = [...queue];
      newQueue[trackIdx] = { ...newQueue[trackIdx], favorite: newFav };
      set({ queue: newQueue });
    }
    dbToggleFavorite(updatedTrack, newFav);
    const trackTitle = updatedTrack.title || updatedTrack.artist || 'track';
    notificationService.favoriteChanged(trackTitle, newFav);
  },

  playNext: async () => {
    if (playNextInFlight) {
      console.warn('[Player] playNext already in flight, ignoring...');
      return;
    }

    playNextInFlight = true;
    setTimeout(() => { playNextInFlight = false; }, 3000);

    try {
      const { queue, currentIndex, shuffle, repeat, discoveryMode } = get();
      if (queue.length === 0) return;

      let nextIndex = currentIndex + 1;

      if (nextIndex >= queue.length) {
        if (repeat === 'all') {
          nextIndex = 0;
        } else if (repeat === 'one') {
          set({ seekTo: 0, isPlaying: true });
          return;
        } else if (discoveryMode) {
          if (discoveryInFlight) return;
          discoveryInFlight = true;
          const currentT = queue[currentIndex];

          try {
            const { MetadataEngine } = await import('@utils/MetadataEngine');
            const recommendations = await MetadataEngine.getDiscoveryQueue(currentT);

            if (recommendations.length > 0) {
              const newTracks: Track[] = recommendations.map(m => ({
                id: m.externalIds?.deezer || Math.random().toString(36).slice(2, 9),
                title: m.title,
                artist: m.artist,
                album: m.album || 'Discovery',
                duration: m.duration,
                artwork: m.artwork?.medium || m.artwork?.large || '',
                filePath: '',
                format: 'YouTube',
                favorite: false,
                dateAdded: new Date().toISOString(),
                playCount: 0,
                externalIds: m.externalIds || {}
              }));

              set({
                queue: [...queue, ...newTracks],
                playbackContext: { type: 'discovery', id: 'smart', name: 'Smart Discovery' }
              });
              // Reset flag before recursive call
              playNextInFlight = false;
              setTimeout(() => get().playNext(), 100);
              return;
            } else {
              set({ isPlaying: false });
              return;
            }
          } catch (e) {
            console.error('Discovery failed:', e);
            set({ isPlaying: false });
            return;
          } finally {
            discoveryInFlight = false;
          }
        } else {
          set({ isPlaying: false });
          return;
        }
      }

      const resolveIfNeeded = async (index: number): Promise<Track | null> => {
        const { queue, setIsResolving } = get();
        const track = queue[index];
        if (!track) return null;
        if (isPlayableTrack(track)) return track;

        setIsResolving(true);
        try {
          const { MetadataEngine } = await import('@utils/MetadataEngine');
          const resolved = await MetadataEngine.resolvePlayableTrack(track);
          if (resolved && isPlayableTrack(resolved)) {
            const newQueue = [...get().queue];
            newQueue[index] = resolved;
            set({ queue: newQueue });
            return resolved;
          }
        } catch (err) {
          console.error('Failed lazy resolution:', err);
        } finally {
          setIsResolving(false);
        }
        return null;
      };

      if (shuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }

      const nextTrack = await resolveIfNeeded(nextIndex);
      if (!nextTrack) {
        const nextValidIndex = queue.findIndex((_, i) => i > currentIndex && i < queue.length);
        if (nextValidIndex !== -1) {
          playNextInFlight = false;
          get().playTrackFromQueue(nextValidIndex);
        } else {
          set({ isPlaying: false });
        }
        return;
      }

      rememberPlayed(nextTrack);
      set({ currentIndex: nextIndex, currentTrack: nextTrack, isPlaying: true, currentTime: 0 });

      const aheadIdx = (nextIndex + 1) % queue.length;
      if (aheadIdx !== nextIndex) {
        resolveIfNeeded(aheadIdx).catch(() => { });
      }
    } finally {
      playNextInFlight = false;
    }
  },



  playPrevious: async () => {
    const { queue, currentIndex, currentTime, setIsResolving } = get();
    if (queue.length === 0) return;

    if (currentTime > 3) {
      set({ seekTo: 0 });
      return;
    }

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    const track = queue[prevIndex];
    if (!track) return;

    if (isPlayableTrack(track)) {
      set({ currentIndex: prevIndex, currentTrack: track, isPlaying: true, currentTime: 0 });
    } else {
      setIsResolving(true);
      try {
        const { MetadataEngine } = await import('@utils/MetadataEngine');
        const resolved = await MetadataEngine.resolvePlayableTrack(track);
        if (resolved) {
          const newQueue = [...get().queue];
          newQueue[prevIndex] = resolved;
          set({ queue: newQueue, currentIndex: prevIndex, currentTrack: resolved, isPlaying: true, currentTime: 0 });
          rememberPlayed(resolved);
        }
      } finally {
        setIsResolving(false);
      }
    }
  },

  playTrackFromQueue: async (index: number) => {
    const { queue, setIsResolving } = get();
    if (index >= 0 && index < queue.length) {
      const track = queue[index];
      if (isPlayableTrack(track)) {
        rememberPlayed(track);
        set({ currentIndex: index, currentTrack: track, isPlaying: true, currentTime: 0 });
      } else {
        setIsResolving(true);
        try {
          const { MetadataEngine } = await import('@utils/MetadataEngine');
          const resolved = await MetadataEngine.resolvePlayableTrack(track);
          if (resolved) {
            const newQueue = [...get().queue];
            newQueue[index] = resolved;
            set({ queue: newQueue, currentIndex: index, currentTrack: resolved, isPlaying: true, currentTime: 0 });
            rememberPlayed(resolved);
          }
        } finally {
          setIsResolving(false);
        }
      }
    }
  },

  updateAudioSettings: (settings) => set((state) => ({
    audioSettings: { ...state.audioSettings, ...settings },
  })),

  updateEQSettings: (settings) => set((state) => ({
    eqSettings: { ...state.eqSettings, ...settings },
  })),

  updateTheme: (theme) => set((state) => ({
    theme: { ...state.theme, ...theme },
  })),

  checkScrobble: async () => {
    const { currentTrack, currentTime, duration, scrobbled } = get();
    if (!currentTrack || scrobbled || duration <= 0) return;

    const scrobbleThreshold = Math.min(duration / 2, 240);
    if (currentTime >= scrobbleThreshold) {
      set({ scrobbled: true });
      try {
        const { lastfmService } = await import('@utils/lastfm');
        await lastfmService.scrobble(currentTrack.artist, currentTrack.title);
      } catch (err) {
        console.error('Failed to scrobble:', err);
      }
    }
  },

  playUnifiedTrack: async (metadata: any, context?: PlaybackContext) => {
    const { queue, currentIndex, playbackContext, setIsResolving } = get();
    const isNewContext = !playbackContext || playbackContext.type !== context?.type || playbackContext.id !== context?.id;
    const defaultContext: PlaybackContext = context || { type: 'search', id: metadata.id, name: metadata.title };

    const isDirect = metadata.isLive || metadata.format === 'Radio' ||
      (typeof metadata.filePath === 'string' && metadata.filePath.trim() !== '' && !metadata.filePath.startsWith('http')) ||
      (typeof metadata.filePath === 'string' && metadata.filePath.includes('/proxy'));

    if (isDirect) {
      // Fix for local files: use backend proxy if it's a local path
      let trackToPlay = { ...metadata };
      if (typeof metadata.filePath === 'string' && !metadata.filePath.startsWith('http') && !metadata.filePath.includes('/proxy') && metadata.filePath.length > 5) {
        trackToPlay.filePath = `http://localhost:3000/api/local/file?path=${encodeURIComponent(metadata.filePath)}`;
      }

      if (isNewContext) {
        set({ queue: [trackToPlay], currentTrack: trackToPlay, currentIndex: 0, isPlaying: true, playbackContext: defaultContext });
      } else {
        const newQueue = [...queue];
        newQueue.splice(currentIndex + 1, 0, trackToPlay);
        set({ queue: newQueue, currentTrack: trackToPlay, currentIndex: currentIndex + 1, isPlaying: true, playbackContext: defaultContext });
      }
      return;
    }

    if (isNewContext) {
      set({ queue: [metadata], currentTrack: metadata, currentIndex: 0, isPlaying: true, playbackContext: defaultContext });
    }

    setIsResolving(true);
    try {
      const { MetadataEngine } = await import('@utils/MetadataEngine');
      const playable = await MetadataEngine.resolvePlayableTrack(metadata);
      if (playable && isPlayableTrack(playable)) {
        if (isNewContext) {
          set({ queue: [playable], currentTrack: playable, currentIndex: 0, isPlaying: true, playbackContext: defaultContext });
        } else {
          const q = [...get().queue];
          q.splice(currentIndex + 1, 0, playable);
          set({ queue: q, currentTrack: playable, currentIndex: currentIndex + 1, isPlaying: true, playbackContext: defaultContext });
        }
        rememberPlayed(playable);
      }
    } finally {
      setIsResolving(false);
    }
  },

  playUnifiedCollection: async (metadataList: any[], startIndex: number = 0, context?: PlaybackContext) => {
    if (!Array.isArray(metadataList) || metadataList.length === 0) return;
    const { setIsResolving } = get();

    const tracks: Track[] = metadataList.map(m => {
      let fPath = m.filePath || '';
      // Transform local paths to proxy URLs
      if (typeof fPath === 'string' && !fPath.startsWith('http') && !fPath.includes('/proxy') && fPath.length > 5) {
        fPath = `http://localhost:3000/api/local/file?path=${encodeURIComponent(fPath)}`;
      }

      return {
        id: m.id || m.externalIds?.spotify || m.externalIds?.deezer || Math.random().toString(36).slice(2, 9),
        title: m.title || 'Unknown',
        artist: m.artist || 'Unknown Artist',
        album: m.album || (context?.type === 'album' ? context.name : 'Unknown Album'),
        duration: m.duration || 0,
        artwork: m.artwork?.medium || m.artwork?.large || m.artwork || '',
        filePath: fPath,
        format: m.format || 'YouTube',
        favorite: !!m.favorite,
        externalIds: m.externalIds || {},
        dateAdded: new Date().toISOString(),
        playCount: 0
      };
    });

    set({ queue: tracks, currentIndex: startIndex, currentTrack: tracks[startIndex], playbackContext: context || null, isPlaying: true, currentTime: 0 });

    setIsResolving(true);
    try {
      const { MetadataEngine } = await import('@utils/MetadataEngine');
      const resolvedTrack = await MetadataEngine.resolvePlayableTrack(metadataList[startIndex]);

      if (resolvedTrack && isPlayableTrack(resolvedTrack)) {
        const updatedQueue = [...get().queue];
        updatedQueue[startIndex] = resolvedTrack;
        set({ queue: updatedQueue, currentTrack: resolvedTrack, isPlaying: true });
        rememberPlayed(resolvedTrack);
      }
    } finally {
      setIsResolving(false);
    }
  },
}));
