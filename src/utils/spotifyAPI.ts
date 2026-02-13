import { getSpotifyToken } from './apiConfig';

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

export async function searchSpotifyTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
  try {
    const token = await getSpotifyToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) throw new Error('Spotify API error');

    const data = await response.json();
    return data.tracks.items;
  } catch (error) {
    console.error('Spotify search error:', error);
    return [];
  }
}

export async function getSpotifyPlaylist(playlistId: string): Promise<SpotifyPlaylist | null> {
  try {
    const token = await getSpotifyToken();

    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) throw new Error('Spotify API error');

    return await response.json();
  } catch (error) {
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
    const token = await getSpotifyToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=isrc:${isrc}&type=track&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.tracks.items[0] || null;
  } catch (error) {
    console.error('Spotify ISRC lookup error:', error);
    return null;
  }
}

export async function getSpotifyRecommendations(
  seedTracks: string[],
  limit: number = 20
): Promise<SpotifyTrack[]> {
  try {
    const token = await getSpotifyToken();

    const trackIds = seedTracks.slice(0, 5).join(',');

    const response = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_tracks=${trackIds}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) throw new Error('Spotify API error');

    const data = await response.json();
    return data.tracks;
  } catch (error) {
    console.error('Spotify recommendations error:', error);
    return [];
  }
}

export async function getSpotifyNewReleases(limit: number = 20): Promise<SpotifyTrack[]> {
  try {
    const token = await getSpotifyToken();

    const response = await fetch(
      `https://api.spotify.com/v1/browse/new-releases?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) throw new Error('Spotify API error');

    const data = await response.json();
    
    const albumIds = data.albums.items.map((album: any) => album.id).join(',');
    
    const tracksResponse = await fetch(
      `https://api.spotify.com/v1/albums?ids=${albumIds}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!tracksResponse.ok) return [];

    const tracksData = await tracksResponse.json();
    
    const tracks: SpotifyTrack[] = [];
    tracksData.albums.forEach((album: any) => {
      if (album.tracks.items.length > 0) {
        tracks.push({
          ...album.tracks.items[0],
          album: {
            name: album.name,
            images: album.images,
          },
        });
      }
    });

    return tracks;
  } catch (error) {
    console.error('Spotify new releases error:', error);
    return [];
  }
}
