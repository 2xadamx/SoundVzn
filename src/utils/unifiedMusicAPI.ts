import { UnifiedTrackMetadata } from '../types';
import { getAPIConfig } from './apiConfig';
import * as Cache from './cacheManager';
import * as Spotify from './spotifyAPI';

const SEARCH_REQUEST_TIMEOUT_MS = 5000;

async function fetchJsonWithTimeout(url: string, init?: RequestInit, timeoutMs: number = SEARCH_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function searchSpotifyAPI(query: string, limit: number = 20): Promise<UnifiedTrackMetadata[]> {
  try {
    const items = await Spotify.searchSpotifyTracks(query, limit);
    return items.map((track: any) => ({
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      albumArtist: (track.album as any).artists?.[0]?.name,
      year: track.album.release_date ? new Date(track.album.release_date).getFullYear() : undefined,
      genre: [],
      duration: Math.floor(track.duration_ms / 1000),
      isrc: track.external_ids?.isrc,
      artwork: {
        small: track.album.images[2]?.url,
        medium: track.album.images[1]?.url,
        large: track.album.images[0]?.url,
        extralarge: track.album.images[0]?.url,
      },
      externalIds: {
        spotify: track.id,
      },
      popularity: track.popularity,
      previewUrl: track.preview_url,
      source: 'spotify' as const,
    }));
  } catch (error) {
    console.error('Spotify search error:', error);
    return [];
  }
}

export async function searchITunesAPI(_query: string, _limit: number = 20): Promise<UnifiedTrackMetadata[]> {
  // Disabled in renderer flow due frequent 403/CORS in desktop webview.
  return [];
}

export async function searchDeezerAPI(query: string, limit: number = 20): Promise<UnifiedTrackMetadata[]> {
  try {
    const response = await fetchJsonWithTimeout(
      `/api-deezer/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    if (!response.ok) throw new Error('Deezer API error');

    const data = await response.json();

    return data.data.map((track: any) => ({
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      albumArtist: track.artist.name,
      duration: track.duration,
      popularity: typeof track.rank === 'number' ? Math.min(100, Math.floor(track.rank / 10000)) : undefined,
      artwork: {
        small: track.album.cover_small,
        medium: track.album.cover_medium,
        large: track.album.cover_big,
        extralarge: track.album.cover_xl,
      },
      externalIds: {
        deezer: track.id?.toString(),
      },
      previewUrl: track.preview,
      source: 'deezer' as const,
    }));
  } catch (error) {
    console.error('Deezer search error:', error);
    return [];
  }
}

export async function searchMusicBrainzAPI(query: string, limit: number = 20): Promise<UnifiedTrackMetadata[]> {
  try {
    const response = await fetchJsonWithTimeout(
      `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) throw new Error('MusicBrainz API error');

    const data = await response.json();

    return data.recordings.map((recording: any) => ({
      title: recording.title,
      artist: recording['artist-credit']?.[0]?.name || 'Unknown Artist',
      album: recording.releases?.[0]?.title || 'Unknown Album',
      year: recording.releases?.[0]?.date ? new Date(recording.releases[0].date).getFullYear() : undefined,
      duration: Math.floor((recording.length || 0) / 1000),
      artwork: {
        medium: recording.releases?.[0]?.id
          ? `https://coverartarchive.org/release/${recording.releases[0].id}/front-500`
          : undefined,
        large: recording.releases?.[0]?.id
          ? `https://coverartarchive.org/release/${recording.releases[0].id}/front-1200`
          : undefined,
      },
      externalIds: {
        musicbrainz: recording.id,
      },
      source: 'musicbrainz' as const,
    }));
  } catch (error) {
    console.error('MusicBrainz search error:', error);
    return [];
  }
}

export async function searchLastFmAPI(query: string, limit: number = 20): Promise<UnifiedTrackMetadata[]> {
  try {
    const config = getAPIConfig();
    const apiKey = config.lastfm.apiKey;

    if (!apiKey) {
      return [];
    }

    const response = await fetchJsonWithTimeout(
      `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${apiKey}&format=json&limit=${limit}`
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (!data.results?.trackmatches?.track) return [];

    const tracks = Array.isArray(data.results.trackmatches.track)
      ? data.results.trackmatches.track
      : [data.results.trackmatches.track];

    return tracks.map((track: any) => ({
      title: track.name,
      artist: track.artist,
      album: '',
      duration: 0,
      artwork: {
        small: track.image?.find((i: any) => i.size === 'small')?.['#text'],
        medium: track.image?.find((i: any) => i.size === 'medium')?.['#text'],
        large: track.image?.find((i: any) => i.size === 'large')?.['#text'],
        extralarge: track.image?.find((i: any) => i.size === 'extralarge')?.['#text'],
      },
      externalIds: {},
      source: 'lastfm' as const,
    }));
  } catch (error: any) {
    if (error.message?.includes('suspended') || error.message?.includes('403')) {
      // Last.fm key is suspended or invalid, fail silently to avoid console clutter
      return [];
    }
    console.warn('Last.fm search skipped:', (error as any)?.message || error);
    return [];
  }
}

type LightArtist = {
  id: string;
  name: string;
  image?: string;
  listeners?: number;
  popularity?: number;
  externalIds?: Record<string, string>;
};

type LightAlbum = {
  id: string;
  name: string;
  artist?: string;
  image?: string;
  year?: number;
  externalIds?: Record<string, string>;
};

function normalizeKey(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeTrackName(name: string) {
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

function normalizeArtistName(name: string) {
  return (name || '')
    .toLowerCase()
    .split(/,|&| y | and | x /)[0]
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trackDuplicateKey(track: UnifiedTrackMetadata) {
  return `${normalizeTrackName(track.title)}|${normalizeArtistName(track.artist)}`;
}

function pickPreferredTrack(existing: UnifiedTrackMetadata, candidate: UnifiedTrackMetadata) {
  const score = (t: UnifiedTrackMetadata) => {
    let s = 0;
    if (t.artwork?.large || t.artwork?.medium) s += 2;
    if (t.duration && t.duration > 0) s += 1;
    if (t.previewUrl) s += 1;
    if (t.source === 'itunes' || t.source === 'deezer') s += 1;
    return s;
  };
  return score(candidate) > score(existing) ? candidate : existing;
}

function searchRelevanceScore(track: UnifiedTrackMetadata, query: string): number {
  const q = normalizeKey(query);
  const t = normalizeTrackName(track.title);
  const a = normalizeArtistName(track.artist);
  let score = 0;
  if (`${t} ${a}` === q) score += 100;
  if (t === q) score += 80;
  if (a === q) score += 60;
  if (t.startsWith(q)) score += 35;
  if (a.startsWith(q)) score += 25;
  if (t.includes(q)) score += 15;
  if (a.includes(q)) score += 10;
  if (track.source === 'itunes') score += 6;
  if (track.source === 'deezer') score += 4;
  if (track.source === 'musicbrainz') score -= 2;
  score += track.popularity ? Math.min(track.popularity, 100) * 0.05 : 0;
  return score;
}

async function searchArtistsLight(query: string, limit: number = 12): Promise<LightArtist[]> {
  const [deezerData, musicBrainzData] = await Promise.allSettled([
    (async () => {
      const response = await fetchJsonWithTimeout(`/api-deezer/search?q=${encodeURIComponent(query)}&limit=${limit * 2}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    })(),
    (async () => {
      const response = await fetchJsonWithTimeout(
        `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.artists || [];
    })(),
  ]);

  const map = new Map<string, LightArtist>();

  if (deezerData.status === 'fulfilled') {
    for (const row of deezerData.value) {
      const artistName = row?.artist?.name || '';
      const key = normalizeKey(artistName);
      if (!key) continue;
      map.set(key, {
        id: `deezer-artist:${row.artist?.id || key}`,
        name: artistName,
        image: row.artist?.picture_medium || row.artist?.picture_big,
        externalIds: { deezer: String(row.artist?.id || '') },
      });
    }
  }

  if (musicBrainzData.status === 'fulfilled') {
    for (const a of musicBrainzData.value.slice(0, limit)) {
      const key = normalizeKey(a.name || '');
      if (!key || map.has(key)) continue;
      map.set(key, {
        id: `mb-artist:${a.id || key}`,
        name: a.name,
        externalIds: { musicbrainz: a.id },
      });
    }
  }

  return Array.from(map.values()).slice(0, limit);
}

async function searchAlbumsLight(query: string, limit: number = 12): Promise<LightAlbum[]> {
  const [deezerData, musicBrainzData] = await Promise.allSettled([
    (async () => {
      const response = await fetchJsonWithTimeout(`/api-deezer/search?q=${encodeURIComponent(query)}&limit=${limit * 2}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    })(),
    (async () => {
      const response = await fetchJsonWithTimeout(
        `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}&type=album|ep|single`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data['release-groups'] || [];
    })(),
  ]);

  const map = new Map<string, LightAlbum>();

  if (deezerData.status === 'fulfilled') {
    for (const row of deezerData.value) {
      const albumName = row?.album?.title || '';
      const artistName = row?.artist?.name || '';
      const key = normalizeKey(`${albumName} ${artistName}`);
      if (!key) continue;
      map.set(key, {
        id: `deezer-album:${row.album?.id || key}`,
        name: albumName,
        artist: artistName,
        image: row.album?.cover_medium || row.album?.cover_big || row.album?.cover_xl,
        externalIds: { deezer: String(row.album?.id || '') },
      });
    }
  }

  if (musicBrainzData.status === 'fulfilled') {
    for (const a of musicBrainzData.value.slice(0, limit)) {
      const albumName = a?.title || '';
      const artistName = a?.['artist-credit']?.[0]?.name || '';
      const key = normalizeKey(`${albumName} ${artistName}`);
      if (!key) continue;
      if (map.has(key)) continue;
      map.set(key, {
        id: `mb-album:${a.id || key}`,
        name: albumName,
        artist: artistName,
        image: a?.id ? `https://coverartarchive.org/release-group/${a.id}/front-500` : undefined,
        year: a?.['first-release-date'] ? new Date(a['first-release-date']).getFullYear() : undefined,
        externalIds: { musicbrainz: a.id },
      });
    }
  }

  return Array.from(map.values()).slice(0, limit);
}

export async function searchUnifiedMultiSource(query: string): Promise<UnifiedTrackMetadata[]> {
  try {
    const cacheKey = `v2:${query.toLowerCase().trim()}`;
    const cached = await Cache.getCachedSearch(cacheKey, 'unified');
    if (cached) return cached;

    // Spotify intentionally excluded from primary search path.
    // MusicBrainz is kept for artist/album metadata, not primary song ranking.
    const results = await Promise.allSettled([
      searchITunesAPI(query, 12),
      searchDeezerAPI(query, 12),
    ]);

    const allTracks: UnifiedTrackMetadata[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allTracks.push(...result.value);
      }
    });

    const uniqueTracks = new Map<string, UnifiedTrackMetadata>();

    allTracks.forEach((track) => {
      const key = trackDuplicateKey(track);
      const existing = uniqueTracks.get(key);
      if (!existing) {
        uniqueTracks.set(key, track);
      } else {
        uniqueTracks.set(key, pickPreferredTrack(existing, track));
      }
    });

    const sortedTracks = Array.from(uniqueTracks.values())
      .sort((a, b) => searchRelevanceScore(b, query) - searchRelevanceScore(a, query));

    const finalizedTracks = sortedTracks
      .filter((t) => searchRelevanceScore(t, query) >= 12)
      .slice(0, 30);

    const outputTracks = finalizedTracks.length > 0 ? finalizedTracks : sortedTracks.slice(0, 30);
    await Cache.setCachedSearch(cacheKey, 'unified', outputTracks);
    return outputTracks;
  } catch (error) {
    console.error('Unified search error:', error);
    return [];
  }
}

export async function searchEverything(query: string) {
  const [tracksResult, albumsResult, artistsResult] = await Promise.allSettled([
    searchUnifiedMultiSource(query),
    searchAlbumsLight(query, 12),
    searchArtistsLight(query, 12),
  ]);

  return {
    tracks: tracksResult.status === 'fulfilled' ? tracksResult.value : [],
    albums: albumsResult.status === 'fulfilled' ? albumsResult.value : [],
    artists: artistsResult.status === 'fulfilled' ? artistsResult.value : [],
  };
}

export async function getTrackMetadataByISRC(isrc: string): Promise<UnifiedTrackMetadata | null> {
  try {
    const track = await Spotify.getSpotifyTrackByISRC(isrc);
    if (!track) return null;
    return {
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      albumArtist: (track.album as any).artists?.[0]?.name,
      year: (track.album as any).release_date ? new Date((track.album as any).release_date).getFullYear() : undefined,
      genre: [],
      duration: Math.floor(track.duration_ms / 1000),
      isrc: track.external_ids?.isrc,
      artwork: {
        small: track.album.images[2]?.url,
        medium: track.album.images[1]?.url,
        large: track.album.images[0]?.url,
        extralarge: track.album.images[0]?.url,
      },
      externalIds: {
        spotify: track.id,
      },
      popularity: track.popularity,
      previewUrl: track.preview_url || undefined,
      source: 'spotify',
    };
  } catch (error) {
    console.error('ISRC lookup error:', error);
    return null;
  }
}
