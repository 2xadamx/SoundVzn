import { create } from 'zustand';
import { Track, AudioSettings, EQSettings, ThemeConfig, PlaybackContext, Mood } from '../types';
import { toggleFavorite as dbToggleFavorite, updatePlayCount, addTrack } from '../utils/database';
import { setNetworkOffline } from '@utils/networkGuard';
import { notificationService } from '@services/notificationService';
import { socialService } from '../utils/socialService';
import { BACKEND_URL } from '../utils/apiConfig';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'error' | 'volume' | 'track';
  message: string;
  icon?: string;
  duration?: number;
}

const FIRST_PLAY_ACHIEVEMENT_KEY = 'soundvzn_first_play_achievement';

let discoveryInFlight = false;


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

    // Call backend stats logging
    if ((window as any).electron?.logPlayback) {
      (window as any).electron.logPlayback(track.id, track.artist, track.title);
    }

    console.log(`[Store] Track persisted to history: ${track.title}`);
    
    // Discord Rich Presence update
    if ((window as any).electron?.updatePresence) {
      (window as any).electron.updatePresence({
        title: track.title,
        artist: track.artist,
        isPlaying: true, // We call this when we start playing
        duration: track.duration,
        currentTime: 0
      });
    }

    // Social Activity Broadcast (Friend Activity Feed)
    socialService.updateActivity('online', {
      track: track.title,
      artist: track.artist,
      cover: track.artwork || null,
      duration: Math.round(track.duration) || 0,
      progress: 0
    }).catch(() => {}); // Silent fail — social is non-critical
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
  isRadioMode: boolean;
  isResolving: boolean;
  playbackContext: PlaybackContext | null;
  analyser: AnalyserNode | null;
  moodLock: boolean;
  currentMood: Mood;
  isGlassOpen: boolean;
  isZenMode: boolean;

  // Supreme Pro State
  appearance: 'stellar-dark' | 'radiant-light' | 'vivid-nebula';
  language: 'es' | 'en' | 'fr' | 'de';
  streamingQuality: 'normal' | 'cd' | 'hi-res';
  dataSaver: boolean;
  offlineMode: boolean;
  sleepTimer: number | null;
  karaokeMode: boolean;
  hapticFeedback: boolean;
  autoGain: boolean;
  reverbPreset: string;
  reverbMix: number;
  isQueueOpen: boolean;
  toasts: Toast[];
  enableInstantPreview: boolean;
  activeAudio: 0 | 1;
  youtubeId: string | null;
  playbackSource: 'api' | 'iframe';
  isIframeReady: boolean;
  deckA: { track: Track | null; isPlaying: boolean; volume: number; vocalMix: number };
  deckB: { track: Track | null; isPlaying: boolean; volume: number; vocalMix: number };

  setAnalyser: (analyser: AnalyserNode | null) => void;
  setPlaybackContext: (context: PlaybackContext | null) => void;
  setIsResolving: (val: boolean) => void;

  setCurrentTrack: (track: Track | null) => void;
  setQueue: (queue: Track[]) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number, silent?: boolean) => void;
  setSeekTo: (time: number | null) => void;
  setCurrentIndex: (index: number) => void;
  setIsLyricsOpen: (isOpen: boolean) => void;
  setIsGlassOpen: (isOpen: boolean) => void;
  setIsQueueOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;
  logout: () => void;
  toggleMute: () => void;

  // Supreme Pro Actions
  setAppearance: (appearance: 'stellar-dark' | 'radiant-light' | 'vivid-nebula') => void;
  setLanguage: (lang: 'es' | 'en' | 'fr' | 'de') => void;
  setStreamingQuality: (quality: 'normal' | 'cd' | 'hi-res') => void;
  setEnableInstantPreview: (val: boolean) => void;
  setYoutubeId: (id: string | null) => void;
  setPlaybackSource: (source: 'api' | 'iframe') => void;
  setIsIframeReady: (ready: boolean) => void;
  setDataSaver: (enabled: boolean) => void;
  setOfflineMode: (enabled: boolean) => void;
  setSleepTimer: (minutes: number | null) => void;
  setKaraokeMode: (enabled: boolean) => void;
  setHapticFeedback: (enabled: boolean) => void;
  setAutoGain: (enabled: boolean) => void;
  setReverbPreset: (preset: string) => void;
  setReverbMix: (mix: number) => void;
  setIsZenMode: (enabled: boolean) => void;
  toggleZenMode: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  loadTrackToDeck: (track: Track, deck: 'A' | 'B') => void;
  setDeckPlaying: (deck: 'A' | 'B', isPlaying: boolean) => void;
  setDeckVocalMix: (deck: 'A' | 'B', mix: number) => void;

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
  setMoodLock: (enabled: boolean) => void;
  setIsRadioMode: (enabled: boolean) => void;
  addToQueue: (tracks: Track | Track[]) => void;
  fetchAndExtendQueue: () => Promise<void>;
}

import { socketManager } from '../utils/socket';

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
    spatialSettings: { x: 0, y: 0, z: 1 },
  },
  isRadioMode: false,
  isResolving: false,
  isGlassOpen: false,
  isZenMode: false,
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
  discoveryMode: false,
  playbackContext: null,
  analyser: null,
  moodLock: false,
  currentMood: 'Neutral',

  // Appearance Pro Settings
  appearance: (localStorage.getItem('theme') as any) || 'stellar-dark',
  language: (localStorage.getItem('lang') as any) || 'es',
  streamingQuality: (localStorage.getItem('streamingQuality') as any) || 'cd',
  enableInstantPreview: localStorage.getItem('enableInstantPreview') !== 'false',
  dataSaver: localStorage.getItem('data_saver') === 'true',
  offlineMode: false,
  sleepTimer: null,
  karaokeMode: false,
  hapticFeedback: localStorage.getItem('haptic_feedback') !== 'false', // Default true
  autoGain: localStorage.getItem('auto_gain') === 'true', // Default false
  reverbPreset: localStorage.getItem('reverb_preset') || 'off',
  reverbMix: parseFloat(localStorage.getItem('reverb_mix') || '0.5'),
  isQueueOpen: false,
  toasts: [],
  activeAudio: 0,
  youtubeId: null,
  playbackSource: 'api',
  isIframeReady: false,
  deckA: { track: null, isPlaying: false, volume: 1, vocalMix: 1 },
  deckB: { track: null, isPlaying: false, volume: 1, vocalMix: 1 },

  setIsRadioMode: (enabled) => set({ isRadioMode: enabled }),
  setIsQueueOpen: (isOpen) => set({ isQueueOpen: isOpen }),
  addToQueue: (tracks) => {
    const list = Array.isArray(tracks) ? tracks : [tracks];
    set((state) => ({ queue: [...state.queue, ...list] }));
  },
  
  fetchAndExtendQueue: async () => {
    const { currentTrack, queue } = get();
    if (!currentTrack || discoveryInFlight) return;
    
    discoveryInFlight = true;
    try {
      const { MetadataEngine } = await import('@utils/MetadataEngine');
      const recommendations = await MetadataEngine.getDiscoveryQueue(currentTrack);
      
      if (recommendations && recommendations.length > 0) {
        const newTracks: Track[] = recommendations.slice(0, 20).map((m: any) => ({
          id: m.externalIds?.deezer || Math.random().toString(36).slice(2, 9),
          title: m.title,
          artist: m.artist,
          album: m.album || 'Discovery',
          duration: m.duration || 0,
          artwork: m.artwork?.medium || m.artwork?.large || m.artwork || '',
          filePath: '',
          format: 'YouTube',
          favorite: false,
          addedDate: new Date().toISOString(),
          playCount: 0,
          externalIds: m.externalIds || {}
        }));
        
        set({ queue: [...queue, ...newTracks] });
      }
    } catch (e) {
      console.error('Queue extension failed:', e);
    } finally {
      discoveryInFlight = false;
    }
  },

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
  setStreamingQuality: (quality) => {
    localStorage.setItem('streamingQuality', quality);
    set({ streamingQuality: quality });
  },
  setEnableInstantPreview: (val) => {
    localStorage.setItem('enableInstantPreview', String(val));
    set({ enableInstantPreview: val });
  },
  setYoutubeId: (youtubeId) => set({ youtubeId }),
  setPlaybackSource: (playbackSource) => set({ playbackSource }),
  setIsIframeReady: (isIframeReady) => set({ isIframeReady }),
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
  setKaraokeMode: (enabled) => {
    set({ karaokeMode: enabled });
    import('../utils/audioProcessor').then(m => m.setKaraokeMode(enabled));
    get().addToast({
      type: 'info',
      message: enabled ? 'Vocal Removal Active 🎤' : 'Vocal Removal Disabled',
      duration: 2000
    });
  },
  setIsZenMode: (enabled) => set({ isZenMode: enabled }),
  setHapticFeedback: (enabled) => {
    localStorage.setItem('haptic_feedback', String(enabled));
    set({ hapticFeedback: enabled });
  },
  setAutoGain: (enabled) => {
    localStorage.setItem('auto_gain', String(enabled));
    set({ autoGain: enabled });
  },
  loadTrackToDeck: (track, deck) => {
    if (deck === 'A') set({ deckA: { ...get().deckA, track } });
    else set({ deckB: { ...get().deckB, track } });
  },
  setDeckPlaying: (deck, isPlaying) => {
    if (deck === 'A') set({ deckA: { ...get().deckA, isPlaying } });
    else set({ deckB: { ...get().deckB, isPlaying } });
  },
  setDeckVocalMix: (deck, mix) => {
    if (deck === 'A') set({ deckA: { ...get().deckA, vocalMix: mix } });
    else set({ deckB: { ...get().deckB, vocalMix: mix } });
  },
  setReverbPreset: (preset) => {
    localStorage.setItem('reverb_preset', preset);
    set({ reverbPreset: preset });
    import('../utils/audioProcessor').then(m => m.setReverbPreset(preset as any));
  },
  setReverbMix: (mix) => {
    localStorage.setItem('reverb_mix', String(mix));
    set({ reverbMix: mix });
    import('../utils/audioProcessor').then(m => m.setReverbMix(mix));
  },
  toggleZenMode: () => {
    const newState = !get().isZenMode;
    set({ isZenMode: newState });
    get().addToast({
      type: 'info',
      message: newState ? 'Modo Zen Activado 🧘' : 'Modo Estándar Restaurado',
      duration: 2500
    });
  },
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => {
      // If it's a volume toast, remove previous volume toasts to avoid flooding
      const filtered = toast.type === 'volume' 
        ? state.toasts.filter(t => t.type !== 'volume')
        : state.toasts;
      return { toasts: [...filtered, { ...toast, id }] };
    });
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration || 3000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  setCurrentTrack: (track) => {
    rememberPlayed(track);
    socketManager.updateActivity(track);
    // Auto-register track in DB for history and easier favorites
    if (track?.id) {
      addTrack(track).then(() => {
        updatePlayCount(track.id).catch(() => { });
        if ((window as any).electron?.logPlayback) {
          (window as any).electron.logPlayback(track.id, track.artist, track.title);
        }
      }).catch(() => { });
    }
    set({ currentTrack: track, scrobbled: false, currentTime: 0 });

    if (track) {
      get().addToast({
        type: 'track',
        message: `${track.title} • ${track.artist}`,
        duration: 4000
      });
    }

    if (track) {
      import('../utils/MoodEngine').then(async ({ MoodEngine }) => {
        const mood = await MoodEngine.detectMood(track);
        set({ currentMood: mood });
        console.log(`[Store] Mood detected: ${mood}`);
      }).catch(err => console.error('Mood detection failed:', err));
    }

    if (track && (track.title === 'Archivo Local' || track.title === 'Unknown' || !track.artist)) {
      setTimeout(() => {
        if (get().currentTrack?.id !== track.id || !get().isPlaying) return;

        import('../utils/FingerprintEngine').then(async ({ FingerprintEngine }) => {
          const enriched = await FingerprintEngine.enrichUnknownTrack(track);
          if (enriched) {
            const { currentTrack, queue } = get();
            if (currentTrack?.id === track.id) {
              set({ currentTrack: enriched });
            }
            const idx = queue.findIndex(t => t.id === track.id);
            if (idx !== -1) {
              const newQueue = [...queue];
              newQueue[idx] = enriched;
              set({ queue: newQueue });
            }
            get().addToast({
              type: 'success',
              message: `Identificado: ${enriched.title} ✨`,
              duration: 3000
            });
          }
        }).catch(() => { });
      }, 5000); // Wait 5s of playback to ensure audio is stable
    }
  },
  setQueue: (queue) => set({ queue }),
  setIsPlaying: (isPlaying) => {
    const { currentTrack, currentTime, duration } = get();
    if (currentTrack && (window as any).electron?.updatePresence) {
      (window as any).electron.updatePresence({
        title: currentTrack.title,
        artist: currentTrack.artist,
        isPlaying,
        duration,
        currentTime
      });
    }
    set({ isPlaying });
  },
  setCurrentTime: (time) => {
    const prevTime = get().currentTime;
    set({ currentTime: time });
    
    // Throttle Discord updates to every 5s ONLY when the integer second changes
    const currentSec = Math.floor(time);
    const prevSec = Math.floor(prevTime);
    
    if (currentSec !== prevSec && currentSec % 5 === 0) {
      const { currentTrack, isPlaying, duration } = get();
      if (currentTrack && (window as any).electron?.updatePresence) {
        (window as any).electron.updatePresence({
          title: currentTrack.title,
          artist: currentTrack.artist,
          isPlaying,
          duration,
          currentTime: time
        });
      }
      // Social update every 15s to avoid flooding
      if (currentSec % 15 === 0 && currentTrack && isPlaying) {
        socialService.updateActivity('online', {
          track: currentTrack.title,
          artist: currentTrack.artist,
          cover: currentTrack.artwork || null,
          duration: Math.round(duration) || 0,
          progress: Math.round(time) || 0
        }).catch(() => {});
      }
    }
  },
  setDuration: (duration) => set({ duration }),
  setVolume: (volume, silent = false) => {
    set((state) => ({
      volume,
      audioSettings: { ...state.audioSettings, volume }
    }));
    if (!silent) {
      // Here we could trigger a specific silent flag if needed by the UI
      get().addToast({
        type: 'volume',
        message: `${Math.round(volume * 100)}%`,
        duration: 1500
      });
    }
  },
  setSeekTo: (time) => set({ seekTo: time }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setIsLyricsOpen: (isOpen) => set({ isLyricsOpen: isOpen }),
  setIsGlassOpen: (isOpen) => set({ isGlassOpen: isOpen }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  logout: () => {
    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('google_token');
    window.location.reload(); // Hard reset for clean state
  },
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
    const { queue, currentIndex, repeat, playbackContext, shuffle, currentTrack, currentTime, currentMood } = get();

    if (currentTrack && currentTime > 0 && currentTime < 30) {
      import('../utils/TasteAnalyzer').then(m => {
        m.TasteAnalyzer.registerSkip(currentTrack, currentMood, currentTime);
      }).catch(err => console.error('Failed to register skip', err));
    }

    if (queue.length === 0) return;

    if (repeat === 'one') {
      set({ seekTo: 0, isPlaying: true });
      return;
    }

    let nextIndex = currentIndex + 1;
    
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }

    if (nextIndex < queue.length) {
      await get().playTrackFromQueue(nextIndex);
    } else if (repeat === 'all' && queue.length > 0) {
      await get().playTrackFromQueue(0);
    } else {
      // Intentar extender cola si estamos en radio o descubrimiento
      if (get().discoveryMode || get().isRadioMode) {
          await get().fetchAndExtendQueue();
          const updatedQueue = get().queue;
          if (updatedQueue.length > queue.length) {
            await get().playTrackFromQueue(nextIndex);
            return;
          }
      }
      set({ isPlaying: false });
    }
  },



  playPrevious: async () => {
    const { queue, currentIndex, currentTime } = get();
    if (queue.length === 0) return;

    if (currentTime > 3) {
      set({ seekTo: 0 });
      return;
    }

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : (get().repeat === 'all' ? queue.length - 1 : currentIndex);
    if (prevIndex === currentIndex && currentTime <= 3) return; // No hay previo

    await get().playTrackFromQueue(prevIndex);
  },

  playTrackFromQueue: async (index: number) => {
    const { queue, setIsResolving, isPlaying: wasPlaying } = get();
    if (index >= 0 && index < queue.length) {
      const track = queue[index];
      
      // Asegurar que forzamos isPlaying a true para que los engines reaccionen
      set({ isPlaying: true });

      // PRELOAD NEXT: Trigger resolution for the track after this one
      const nextIdx = index + 1;
      if (nextIdx < queue.length && !isPlayableTrack(queue[nextIdx])) {
        import('@utils/MetadataEngine').then(({ MetadataEngine }) => {
          MetadataEngine.resolvePlayableTrack(queue[nextIdx]).then(resolved => {
            if (resolved) {
              const currentQueue = get().queue;
              const newQueue = [...currentQueue];
              newQueue[nextIdx] = resolved;
              set({ queue: newQueue });
            }
          });
        });
      }

      if (isPlayableTrack(track)) {
        const { activeAudio, audioSettings } = get();
        const nextAudio = activeAudio === 0 ? 1 : 0;
        const fadeTime = audioSettings.crossfade || 0;

        rememberPlayed(track);
        
        if (track.filePath && track.filePath.startsWith('http')) {
            set({ playbackSource: 'api', isPlaying: true });
        } else {
            const ytId = track.externalIds?.youtubeId || (track.id?.length === 11 ? track.id : null);
            if (ytId) {
                set({ youtubeId: ytId, playbackSource: 'iframe', isPlaying: true });
            }
        }

        if (fadeTime > 0) {
            import('../utils/audioProcessor').then(({ crossfade }) => {
                crossfade(nextAudio, fadeTime);
                set({ activeAudio: nextAudio, currentIndex: index, currentTrack: track, currentTime: 0 });
            });
        } else {
            set({ activeAudio: nextAudio, currentIndex: index, currentTrack: track, currentTime: 0 });
        }
      } else {
        setIsResolving(true);
        try {
          const { MetadataEngine } = await import('@utils/MetadataEngine');
          const resolved = await MetadataEngine.resolvePlayableTrack(track);
          if (resolved) {
            const newQueue = [...get().queue];
            newQueue[index] = resolved;
            
            if (resolved.filePath && resolved.filePath.startsWith('http')) {
                set({ playbackSource: 'api', isPlaying: true });
            } else {
                const ytId = resolved.externalIds?.youtubeId || (resolved.id?.length === 11 ? resolved.id : null);
                if (ytId) {
                  set({ youtubeId: ytId, playbackSource: 'iframe', isPlaying: true });
                }
            }

            set({ queue: newQueue, currentIndex: index, currentTrack: resolved, currentTime: 0 });
            rememberPlayed(resolved);
          }
        } finally {
          setIsResolving(false);
        }
      }
    }
  },

  updateAudioSettings: (settings) => {
    const newSettings = { ...get().audioSettings, ...settings };
    set({ audioSettings: newSettings });

    // Sync with audio processor if position changed
    if (settings.spatialSettings) {
      const { x, y, z } = settings.spatialSettings;
      import('../utils/audioProcessor').then(m => m.setSpatialPosition(x, y, z));
    }
  },

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
        // Scrobble to Last.fm
        const { lastfmService } = await import('@utils/lastfm');
        await lastfmService.scrobble(currentTrack.artist, currentTrack.title);
      } catch (err) {
        console.error('Failed to scrobble to Last.fm:', err);
      }
      // Log to backend for stats
      try {
        const token = localStorage.getItem('svzn_token');
        if (token) {
          fetch(`${BACKEND_URL}/api/user/scrobble`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              trackId: currentTrack.id,
              trackName: currentTrack.title,
              artist: currentTrack.artist,
              album: currentTrack.album || '',
              durationMs: Math.round(duration * 1000),
            }),
          }).catch(() => {});
        }
      } catch (_) {}
    }
  },

  playUnifiedTrack: async (metadata: any, context?: PlaybackContext) => {
    if (!metadata) return;
    
    console.log('[PlayerStore] playUnifiedTrack:', metadata.title);
    
    const { queue, currentIndex, playbackContext } = get();
    const isNewContext = !playbackContext || playbackContext.type !== context?.type || playbackContext.id !== context?.id;
    const defaultContext: PlaybackContext = context || { type: 'search', id: metadata.id, name: metadata.title };

    // FASE 1: Preparación Atómica (UI Instantánea)
    set({ 
        isResolving: true, 
        isPlaying: true, 
        currentTime: 0,
        playbackContext: defaultContext
    });

    // Asegurar estructura del track
    const trackToPlay = {
        ...metadata,
        id: metadata.id || `ext-${Date.now()}`,
        artwork: metadata.artwork?.large || metadata.artwork?.medium || metadata.artwork || ""
    };

    // FASE 2: Gestión de Cola
    if (isNewContext) {
        set({ queue: [trackToPlay], currentTrack: trackToPlay, currentIndex: 0 });
    } else {
        const nextIdx = currentIndex + 1;
        const newQueue = [...queue];
        newQueue.splice(nextIdx, 0, trackToPlay);
        set({ queue: newQueue, currentTrack: trackToPlay, currentIndex: nextIdx });
    }

    // FASE 3: Resolución de Fuente (Background)
    try {
        const { MetadataEngine } = await import('@utils/MetadataEngine');
        const playable = await MetadataEngine.resolvePlayableTrack(trackToPlay);
        
        if (playable) {
            const currentQueue = get().queue;
            const idx = currentQueue.findIndex(t => t.id === trackToPlay.id);
            
            if (idx !== -1) {
                const updatedQueue = [...currentQueue];
                updatedQueue[idx] = playable;

                // Conmutar fuente
                const source = playable.filePath ? 'api' : 'iframe';
                const yid = playable.externalIds?.youtubeId || (playable.id?.length === 11 ? playable.id : null);

                // Si sigue siendo el track actual, actualizar todo
                if (get().currentIndex === idx) {
                    set({ 
                        queue: updatedQueue, 
                        currentTrack: playable, 
                        playbackSource: source,
                        youtubeId: source === 'iframe' ? yid : get().youtubeId,
                        isPlaying: true
                    });
                } else {
                    set({ queue: updatedQueue });
                }
            }
            
            const { updatePlayCount } = await import('../utils/database');
            updatePlayCount(playable.id).catch(() => {});
        } else {
            // Resolución fallida — informar al usuario y detener reproducción
            console.warn('[PlayerStore] Track resolution returned null for:', trackToPlay.title);
            get().addToast({
                type: 'error',
                message: `No se pudo reproducir "${trackToPlay.title}" — sin conexión al servidor`,
                duration: 5000
            });
            set({ isPlaying: false });
        }
    } catch (error) {
        console.error('[PlayerStore] Error resolving track:', error);
        get().addToast({
            type: 'error',
            message: `Error al reproducir "${trackToPlay.title}"`,
            duration: 4000
        });
        set({ isPlaying: false });
    } finally {
        set({ isResolving: false });
        if (isNewContext && (defaultContext.type === 'search' || defaultContext.type === 'library')) {
            get().fetchAndExtendQueue().catch(() => {});
        }
    }
  },


  playUnifiedCollection: async (metadataList: any[], startIndex: number = 0, context?: PlaybackContext) => {
    if (!Array.isArray(metadataList) || metadataList.length === 0) return;
    
    // FASE 1: Preparación de tracks y UI instantánea
    const tracks: Track[] = metadataList.map(m => {
      let fPath = m.filePath || '';
      if (typeof fPath === 'string' && !fPath.startsWith('http') && !fPath.includes('/proxy') && fPath.length > 5) {
        fPath = `${BACKEND_URL}/api/local/file?path=${encodeURIComponent(fPath)}`;
      }

      return {
        id: m.id || Math.random().toString(36).slice(2, 9),
        title: m.title || 'Unknown',
        artist: m.artist || 'Unknown Artist',
        album: m.album || (context?.type === 'album' ? context.name : 'Unknown Album'),
        duration: m.duration || 0,
        artwork: m.artwork?.medium || m.artwork?.large || m.artwork || '',
        filePath: fPath,
        format: m.format || 'YouTube',
        favorite: !!m.favorite,
        externalIds: m.externalIds || {},
        addedDate: new Date().toISOString(),
        playCount: 0
      };
    });

    const firstTrack = tracks[startIndex];
    set({ 
        queue: tracks, 
        currentIndex: startIndex, 
        currentTrack: firstTrack, 
        playbackContext: context || null, 
        isPlaying: true, 
        currentTime: 0,
        playbackSource: firstTrack.filePath ? 'api' : 'iframe',
        isResolving: true
    });

    // FASE 2: Resolución del primer track para asegurar sonido
    try {
      const { MetadataEngine } = await import('@utils/MetadataEngine');
      const resolved = await MetadataEngine.resolvePlayableTrack(metadataList[startIndex]);

      if (resolved) {
        const updatedQueue = [...get().queue];
        updatedQueue[startIndex] = resolved;
        
        const source = resolved.filePath ? 'api' : 'iframe';
        const yid = resolved.externalIds?.youtubeId || (resolved.id?.length === 11 ? resolved.id : null);

        set({ 
            queue: updatedQueue, 
            currentTrack: resolved, 
            playbackSource: source,
            youtubeId: source === 'iframe' ? yid : get().youtubeId 
        });
        
        const { updatePlayCount } = await import('../utils/database');
        updatePlayCount(resolved.id).catch(() => {});
      }
    } catch (err) {
      console.error('[PlayerStore] Collection resolution failed:', err);
    } finally {
      set({ isResolving: false });
    }
  },

  setMoodLock: (enabled: boolean) => {
    set({ moodLock: enabled });
    notificationService.moodLockToggled(enabled, get().currentMood);
  },
}));
