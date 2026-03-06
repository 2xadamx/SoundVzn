/// <reference types="vite/client" />
// URL del backend (Electron).
export const BACKEND_URL = 'http://localhost:3000';

export interface MusicAPIConfig {
  spotify: {
    clientId: string;
    clientSecret: string;
    enabled: boolean;
  };
  lastfm: {
    apiKey: string;
    secret: string;
    enabled: boolean;
  };
  // AudD removed — service discontinued
}

const CONFIG: MusicAPIConfig = {
  spotify: {
    clientId: import.meta.env?.VITE_SPOTIFY_CLIENT_ID || '',
    clientSecret: '', // Secret managed by backend
    enabled: false,
  },
  lastfm: {
    apiKey: import.meta.env?.VITE_LASTFM_API_KEY || '',
    secret: '', // Secret managed by backend
    enabled: false,
  },
};

// Update enabled status based on public env keys
CONFIG.spotify.enabled = !!CONFIG.spotify.clientId;
CONFIG.lastfm.enabled = !!CONFIG.lastfm.apiKey;

let spotifyToken: string | null = null;
let spotifyTokenExpiry: number = 0;

function loadSavedConfig() {
  try {
    const raw = localStorage.getItem('soundvizion_api_config');
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved?.spotify?.clientId) CONFIG.spotify.clientId = saved.spotify.clientId;
    if (saved?.lastfm?.apiKey) CONFIG.lastfm.apiKey = saved.lastfm.apiKey;
    // NEVER load secrets from localStorage
    CONFIG.spotify.enabled = !!CONFIG.spotify.clientId;
    CONFIG.lastfm.enabled = !!CONFIG.lastfm.apiKey;
  } catch { }
}
loadSavedConfig();

export function getYouTubeAPIKey(): string {
  return import.meta.env?.VITE_YOUTUBE_API_KEY || '';
}

export async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) {
    return spotifyToken;
  }

  if (!CONFIG.spotify.clientId) {
    CONFIG.spotify.enabled = false;
    throw new Error('Spotify Client ID not configured');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/spotify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to get Spotify token from backend: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    spotifyToken = data.access_token || '';
    spotifyTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    CONFIG.spotify.enabled = true;

    return spotifyToken || '';
  } catch (error) {
    CONFIG.spotify.enabled = false;
    console.error('Error in getSpotifyToken (frontend):', error);
    throw error;
  }
}

export function getAPIConfig(): MusicAPIConfig {
  return CONFIG;
}

export default CONFIG;
