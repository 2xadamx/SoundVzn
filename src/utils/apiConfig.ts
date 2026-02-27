/// <reference types="vite/client" />
// URL del backend (Electron). En desarrollo: Vite corre en 5199, backend en 3000.
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
  audd: {
    apiKey: string;
    enabled: boolean;
  };
}

const CONFIG: MusicAPIConfig = {
  spotify: {
    clientId: import.meta.env?.VITE_SPOTIFY_CLIENT_ID || '',
    clientSecret: '', // Secret gestionado por el backend
    enabled: false,
  },
  lastfm: {
    apiKey: import.meta.env?.VITE_LASTFM_API_KEY || '',
    secret: '', // Secret gestionado por el backend
    enabled: false,
  },
  audd: {
    apiKey: '', // Key gestionada por el backend
    enabled: false,
  },
};

// Update enabled status based on environment variables (only public keys here)
CONFIG.spotify.enabled = !!CONFIG.spotify.clientId;
CONFIG.lastfm.enabled = !!CONFIG.lastfm.apiKey;
// Audd.io no tiene key pública, así que se asume deshabilitado hasta confirmación del backend
CONFIG.audd.enabled = false;

let spotifyToken: string | null = null;
let spotifyTokenExpiry: number = 0;

function loadSavedConfig() {
  try {
    const raw = localStorage.getItem('soundvizion_api_config');
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved?.spotify?.clientId) CONFIG.spotify.clientId = saved.spotify.clientId;
    if (saved?.lastfm?.apiKey) CONFIG.lastfm.apiKey = saved.lastfm.apiKey;
    if (saved?.audd?.apiKey) CONFIG.audd.apiKey = saved.audd.apiKey;
    // NUNCA cargar clientSecret ni secret desde localStorage (riesgo de exposición)
    CONFIG.spotify.enabled = !!CONFIG.spotify.clientId;
    CONFIG.lastfm.enabled = !!CONFIG.lastfm.apiKey;
  } catch { }
}
loadSavedConfig();

// En Vite SIEMPRE usar import.meta.env.VITE_* (nunca process.env en frontend)
export function getYouTubeAPIKey(): string {
  return import.meta.env?.VITE_YOUTUBE_API_KEY || '';
}

export async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) {
    return spotifyToken;
  }

  // Ahora solo necesitamos el Client ID para habilitar la API, el Secret está en el backend
  if (!CONFIG.spotify.clientId) {
    CONFIG.spotify.enabled = false;
    throw new Error('Spotify Client ID not configured');
  }

  try {
    // FASE 1.2: Frontend Spotify (Usar endpoint backend correcto)
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
    // Renew 1 minute before expiry
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
