import { BACKEND_URL } from './apiConfig';
const SPOTIFY_BACKEND_TIMEOUT_MS = 5000;
const SPOTIFY_DISABLE_MS = 5 * 60 * 1000;
let spotifyDisabledUntil = 0;
let spotifyDisableWarned = false;

function isSpotifyTemporarilyDisabled(): boolean {
  return Date.now() < spotifyDisabledUntil;
}

function disableSpotifyTemporarily(reason: string) {
  spotifyDisabledUntil = Date.now() + SPOTIFY_DISABLE_MS;
  if (!spotifyDisableWarned) {
    spotifyDisableWarned = true;
    console.warn(`Spotify temporarily disabled: ${reason}`);
  }
}

function shouldSilenceSpotifyError(error: any): boolean {
  const message = String(error?.message || '');
  return message.includes('SPOTIFY_DISABLED');
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  duration_ms: number;
  preview_url: string | null;
  external_ids: { isrc?: string };
  popularity: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  tracks: {
    total: number;
    items: Array<{
      track: SpotifyTrack;
    }>;
  };
}

// Todas las llamadas a Spotify pasan por el backend (token en servidor, nunca en frontend)
async function spotifyBackendGet(path: string): Promise<any> {
  if (isSpotifyTemporarilyDisabled()) {
    throw new Error('SPOTIFY_DISABLED');
  }
  const url = `${BACKEND_URL}${path.startsWith('/') ? path : '/' + path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SPOTIFY_BACKEND_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    const text = await response.text();
    let errData: any;
    try {
      errData = JSON.parse(text);
    } catch {
      errData = { error: text || response.statusText };
    }
    if (
      (response.status === 400 && errData?.error === 'invalid_client') ||
      response.status === 401 ||
      response.status === 403
    ) {
      disableSpotifyTemporarily(`${response.status}${errData?.error ? `:${errData.error}` : ''}`);
      throw new Error('SPOTIFY_DISABLED');
    }
    console.warn(`Spotify backend ${response.status}:`, errData?.error || path);
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function searchSpotifyTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
  try {
    const data = await spotifyBackendGet(
      `/api/spotify/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`
    );
    return data.tracks?.items ?? [];
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return [];
    console.error('Spotify search error:', error);
    return [];
  }
}

export async function searchSpotifyArtists(query: string, limit: number = 20) {
  try {
    const data = await spotifyBackendGet(
      `/api/spotify/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`
    );
    return data.artists?.items ?? [];
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return [];
    console.error('Spotify artist search error:', error);
    return [];
  }
}

export async function searchSpotifyAlbums(query: string, limit: number = 20) {
  try {
    const data = await spotifyBackendGet(
      `/api/spotify/search?q=${encodeURIComponent(query)}&type=album&limit=${limit}`
    );
    return data.albums?.items ?? [];
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return [];
    console.error('Spotify album search error:', error);
    return [];
  }
}

export async function getSpotifyPlaylist(playlistId: string): Promise<SpotifyPlaylist | null> {
  try {
    return await spotifyBackendGet(`/api/spotify/playlists/${playlistId}`);
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return null;
    console.error('Spotify playlist error:', error);
    return null;
  }
}

export async function importSpotifyPlaylistFull(playlistUrl: string): Promise<{
  name: string;
  description: string;
  tracks: Array<{
    title: string;
    artist: string;
    album: string;
    duration: number;
    artwork: string;
    isrc?: string;
    spotifyId: string;
  }>;
} | null> {
  try {
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      throw new Error('Invalid Spotify playlist URL');
    }

    const playlist = await getSpotifyPlaylist(playlistId);
    if (!playlist) return null;

    const tracks = playlist.tracks.items.map((item) => ({
      title: item.track.name,
      artist: item.track.artists.map((a) => a.name).join(', '),
      album: item.track.album.name,
      duration: Math.floor(item.track.duration_ms / 1000),
      artwork: item.track.album.images[0]?.url || '',
      isrc: item.track.external_ids?.isrc,
      spotifyId: item.track.id,
    }));

    return {
      name: playlist.name,
      description: playlist.description || '',
      tracks,
    };
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return null;
    console.error('Import Spotify playlist error:', error);
    return null;
  }
}

function extractPlaylistId(url: string): string | null {
  const patterns = [
    /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export async function getSpotifyTrackByISRC(isrc: string): Promise<SpotifyTrack | null> {
  try {
    const data = await spotifyBackendGet(`/api/spotify/search?q=isrc:${encodeURIComponent(isrc)}&type=track&limit=1`);
    return data.tracks?.items?.[0] ?? null;
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return null;
    console.error('Spotify ISRC lookup error:', error);
    return null;
  }
}

export async function getSpotifyRecommendations(
  seedTracks: string[],
  limit: number = 20
): Promise<SpotifyTrack[]> {
  try {
    const trackIds = seedTracks.slice(0, 5).join(',');
    const data = await spotifyBackendGet(`/api/spotify/recommendations?seed_tracks=${trackIds}&limit=${limit}`);
    return data.tracks ?? [];
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return [];
    console.error('Spotify recommendations error:', error);
    return [];
  }
}

export async function getSpotifyNewReleases(limit: number = 20): Promise<SpotifyTrack[]> {
  try {
    const data = await spotifyBackendGet(`/api/spotify/browse/new-releases?limit=${limit}`);
    const albumIds = (data.albums?.items ?? []).map((a: any) => a.id).join(',');
    if (!albumIds) return [];
    const albumsRes = await spotifyBackendGet(`/api/spotify/albums?ids=${albumIds}`);
    const tracks: SpotifyTrack[] = [];
    (albumsRes.albums ?? []).forEach((album: any) => {
      if (album?.tracks?.items?.length > 0) {
        tracks.push({
          ...album.tracks.items[0],
          album: { name: album.name, images: album.images ?? [] },
        });
      }
    });
    return tracks;
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return [];
    console.error('Spotify new releases error:', error);
    return [];
  }
}

export async function getSpotifyArtistInfo(artistId: string) {
  try {
    return await spotifyBackendGet(`/api/spotify/artists/${artistId}`);
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return null;
    console.error('Spotify artist info error:', error);
    return null;
  }
}

export async function getSpotifyArtistTopTracks(artistId: string, market: string = 'US'): Promise<SpotifyTrack[]> {
  try {
    const data = await spotifyBackendGet(`/api/spotify/artists/${artistId}/top-tracks?market=${market}`);
    return data.tracks ?? [];
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return [];
    console.error('Spotify artist top tracks error:', error);
    return [];
  }
}

export async function getSpotifyArtistAlbums(artistId: string, limit: number = 20) {
  try {
    const data = await spotifyBackendGet(`/api/spotify/artists/${artistId}/albums?limit=${limit}`);
    return data.items ?? [];
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return [];
    console.error('Spotify artist albums error:', error);
    return [];
  }
}

export async function getSpotifyArtistRelatedArtists(artistId: string) {
  try {
    const data = await spotifyBackendGet(`/api/spotify/artists/${artistId}/related-artists`);
    return data.artists ?? [];
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return [];
    console.error('Spotify related artists error:', error);
    return [];
  }
}

export async function getSpotifyAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
  try {
    const data = await spotifyBackendGet(`/api/spotify/albums/${albumId}/tracks`);
    return data.items ?? [];
  } catch (error) {
    if (shouldSilenceSpotifyError(error)) return [];
    console.error('Spotify album tracks error:', error);
    return [];
  }
}
