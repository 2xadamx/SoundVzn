import { create } from 'zustand';
import { Track, AudioSettings, EQSettings, ThemeConfig } from '@types/index';

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

  setCurrentTrack: (track: Track | null) => void;
  setQueue: (queue: Track[]) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playNext: () => void;
  playPrevious: () => void;
  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
  updateEQSettings: (settings: Partial<EQSettings>) => void;
  updateTheme: (theme: Partial<ThemeConfig>) => void;
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

  setCurrentTrack: (track) => set({ currentTrack: track }),
  setQueue: (queue) => set({ queue }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume, audioSettings: { ...get().audioSettings, volume } }),
  toggleMute: () => set((state) => ({ muted: !state.muted })),
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
  toggleRepeat: () => set((state) => ({
    repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off',
  })),
  
  playNext: () => {
    const { queue, currentIndex, repeat, shuffle } = get();
    if (queue.length === 0) return;

    let nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      nextIndex = repeat === 'all' ? 0 : currentIndex;
    }

    if (shuffle && repeat !== 'one') {
      nextIndex = Math.floor(Math.random() * queue.length);
    }

    set({ currentIndex: nextIndex, currentTrack: queue[nextIndex] });
  },

  playPrevious: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return;

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    set({ currentIndex: prevIndex, currentTrack: queue[prevIndex] });
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
}));
