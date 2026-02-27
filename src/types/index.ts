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
  favorite: boolean;
  dateAdded: string;
  lastPlayed?: string;
  playCount: number;
  externalIds?: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
    musicbrainz?: string;
    isrc?: string;
    youtubeId?: string;
  };
  isLive?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: string[];
  createdDate: Date;
  updatedDate: Date;
  artwork?: string;
  isLiked?: boolean; // Followed/Liked playlist
}

export type PlaybackContextType = 'album' | 'artist' | 'search' | 'library' | 'radio' | 'discovery';

export interface PlaybackContext {
  type: PlaybackContextType;
  id?: string;
  name?: string;
  data?: any;
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
  downloadTrack: (videoId: string, title?: string, artist?: string) => Promise<{ success: boolean; filePath?: string; alreadyExists?: boolean; error?: string }>;
  getDownloadPath: (videoId: string) => Promise<string | null>;
  getStorageSize: () => Promise<number>;
  openDownloadFolder: () => Promise<void>;
  onDownloadProgress: (callback: (data: { videoId: string; percent: number }) => void) => void;
  saveData: (key: string, data: any) => Promise<{ success: boolean; error?: string }>;
  loadData: (key: string) => Promise<any>;
  setAutoStart: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  clearCache: () => Promise<{ success: boolean; error?: string }>;
  log: (level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: any) => Promise<boolean>;
  exportLogs: () => Promise<string | null>;
  getSystemPerf: () => Promise<{ ramMB: number; uptime: number; platform: string; arch: string }>;
  saveAvatar: (filePath: string) => Promise<string | null>;
  submitBug: (data: { description: string; includeLogs: boolean; email?: string }) =>
    Promise<{ success: boolean; path?: string; error?: string }>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
export interface UnifiedTrackMetadata {
  title: string;
  artist: string;
  album: string;
  albumArtist?: string;
  year?: number;
  genre?: string[];
  duration: number;
  isrc?: string;
  artwork: {
    small?: string;
    medium?: string;
    large?: string;
    extralarge?: string;
  };
  externalIds: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
    musicbrainz?: string;
  };
  popularity?: number;
  previewUrl?: string;
  source: 'spotify' | 'itunes' | 'deezer' | 'musicbrainz' | 'lastfm';
}
