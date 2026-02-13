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

const YOUTUBE_API_KEY = 'AIzaSyDBkGUjFKIcoVhP6LUHymVNEP5t4_qi8vo';

const CONFIG: MusicAPIConfig = {
  spotify: {
    clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID || localStorage.getItem('spotify_client_id') || '',
    clientSecret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || localStorage.getItem('spotify_client_secret') || '',
    enabled: false,
  },
  lastfm: {
    apiKey: import.meta.env.VITE_LASTFM_API_KEY || localStorage.getItem('lastfm_api_key') || '',
    secret: import.meta.env.VITE_LASTFM_SECRET || localStorage.getItem('lastfm_secret') || '',
    enabled: false,
  },
  audd: {
    apiKey: import.meta.env.VITE_AUDD_API_KEY || localStorage.getItem('audd_api_key') || '',
    enabled: false,
  },
};

export function getYouTubeAPIKey(): string {
  return YOUTUBE_API_KEY;
}

let spotifyToken: string | null = null;
let spotifyTokenExpiry: number = 0;

export async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) {
    return spotifyToken;
  }

  if (!CONFIG.spotify.clientId || !CONFIG.spotify.clientSecret) {
    CONFIG.spotify.enabled = false;
    throw new Error('Spotify credentials not configured');
  }

  const credentials = btoa(`${CONFIG.spotify.clientId}:${CONFIG.spotify.clientSecret}`);

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Failed to get Spotify token');
    }

    const data = await response.json();
    spotifyToken = data.access_token;
    spotifyTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    CONFIG.spotify.enabled = true;

    return spotifyToken;
  } catch (error) {
    CONFIG.spotify.enabled = false;
    throw error;
  }
}

export async function testAPIConnections(): Promise<{
  spotify: boolean;
  lastfm: boolean;
  audd: boolean;
  itunes: boolean;
  musicbrainz: boolean;
  deezer: boolean;
}> {
  const results = {
    spotify: false,
    lastfm: false,
    audd: false,
    itunes: true,
    musicbrainz: true,
    deezer: true,
  };

  try {
    await getSpotifyToken();
    results.spotify = true;
  } catch {
    results.spotify = false;
  }

  if (CONFIG.lastfm.apiKey) {
    try {
      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${CONFIG.lastfm.apiKey}&format=json&limit=1`
      );
      results.lastfm = response.ok;
    } catch {
      results.lastfm = false;
    }
  }

  if (CONFIG.audd.apiKey) {
    try {
      const response = await fetch(
        `https://api.audd.io/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `api_token=${CONFIG.audd.apiKey}&return=timecode`,
        }
      );
      results.audd = response.ok;
    } catch {
      results.audd = false;
    }
  }

  return results;
}

export function getAPIConfig(): MusicAPIConfig {
  return CONFIG;
}

export function updateAPIConfig(updates: Partial<MusicAPIConfig>): void {
  if (updates.spotify) {
    Object.assign(CONFIG.spotify, updates.spotify);
    if (updates.spotify.clientId) {
      localStorage.setItem('spotify_client_id', updates.spotify.clientId);
    }
    if (updates.spotify.clientSecret) {
      localStorage.setItem('spotify_client_secret', updates.spotify.clientSecret);
    }
  }
  if (updates.lastfm) {
    Object.assign(CONFIG.lastfm, updates.lastfm);
    if (updates.lastfm.apiKey) {
      localStorage.setItem('lastfm_api_key', updates.lastfm.apiKey);
    }
  }
  if (updates.audd) {
    Object.assign(CONFIG.audd, updates.audd);
    if (updates.audd.apiKey) {
      localStorage.setItem('audd_api_key', updates.audd.apiKey);
    }
  }

  localStorage.setItem('soundvzn_api_config', JSON.stringify(CONFIG));
}

export function loadAPIConfig(): void {
  const saved = localStorage.getItem('soundvzn_api_config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(CONFIG, parsed);
    } catch (e) {
      console.error('Failed to load API config:', e);
    }
  }
}
