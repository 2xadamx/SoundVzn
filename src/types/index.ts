export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  filePath: string;
  format: string;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  year?: number;
  genre?: string;
  artwork?: string;
  addedDate: Date;
  lastPlayed?: Date;
  playCount: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: string[];
  createdDate: Date;
  updatedDate: Date;
  artwork?: string;
}

export interface AudioSettings {
  volume: number;
  muted: boolean;
  outputDevice?: string;
  sampleRate: number;
  bitDepth: number;
  exclusiveMode: boolean;
  replayGain: boolean;
  crossfade: number;
}

export interface EQBand {
  frequency: number;
  gain: number;
  q: number;
}

export interface EQSettings {
  enabled: boolean;
  preset: string;
  bands: EQBand[];
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  accentColor: string;
  albumArtBlur: boolean;
  animations: boolean;
}

export interface AppState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  audioSettings: AudioSettings;
  eqSettings: EQSettings;
  theme: ThemeConfig;
}

export interface ElectronAPI {
  openDirectory: () => Promise<string[]>;
  openFile: () => Promise<string[]>;
  readMetadata: (filePath: string) => Promise<any>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
