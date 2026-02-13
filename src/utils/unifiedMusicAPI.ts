import { getSpotifyToken } from './apiConfig';

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

export async function searchSpotifyAPI(query: string, limit: number = 20): Promise<UnifiedTrackMetadata[]> {
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

    return data.tracks.items.map((track: any) => ({
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      albumArtist: track.album.artists[0]?.name,
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

export async function searchITunesAPI(query: string, limit: number = 20): Promise<UnifiedTrackMetadata[]> {
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`
    );

    if (!response.ok) throw new Error('iTunes API error');

    const data = await response.json();

    return data.results.map((track: any) => ({
      title: track.trackName,
      artist: track.artistName,
      album: track.collectionName,
      albumArtist: track.artistName,
      year: track.releaseDate ? new Date(track.releaseDate).getFullYear() : undefined,
      genre: track.primaryGenreName ? [track.primaryGenreName] : [],
      duration: Math.floor(track.trackTimeMillis / 1000),
      artwork: {
        small: track.artworkUrl60,
        medium: track.artworkUrl100,
        large: track.artworkUrl100?.replace('100x100', '600x600'),
        extralarge: track.artworkUrl100?.replace('100x100', '1200x1200'),
      },
      externalIds: {
        appleMusic: track.trackId?.toString(),
      },
      previewUrl: track.previewUrl,
      source: 'itunes' as const,
    }));
  } catch (error) {
    console.error('iTunes search error:', error);
    return [];
  }
}

export async function searchDeezerAPI(query: string, limit: number = 20): Promise<UnifiedTrackMetadata[]> {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    if (!response.ok) throw new Error('Deezer API error');

    const data = await response.json();

    return data.data.map((track: any) => ({
      title: track.title,
      artist: track.artist.name,
      album: track.album.title,
      albumArtist: track.artist.name,
      duration: track.duration,
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
    const response = await fetch(
      `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`,
      {
        headers: {
          'User-Agent': 'SoundVzn/1.0.0 (contact@soundvzn.com)',
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

export async function searchLastFmAPI(query: string, apiKey: string, limit: number = 20): Promise<UnifiedTrackMetadata[]> {
  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${apiKey}&format=json&limit=${limit}`
    );

    if (!response.ok) throw new Error('Last.fm API error');

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
  } catch (error) {
    console.error('Last.fm search error:', error);
    return [];
  }
}

export async function searchUnifiedMultiSource(query: string): Promise<UnifiedTrackMetadata[]> {
  const results = await Promise.allSettled([
    searchSpotifyAPI(query, 15),
    searchITunesAPI(query, 15),
    searchDeezerAPI(query, 15),
    searchMusicBrainzAPI(query, 10),
  ]);

  const allTracks: UnifiedTrackMetadata[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allTracks.push(...result.value);
    }
  });

  const uniqueTracks = new Map<string, UnifiedTrackMetadata>();

  allTracks.forEach((track) => {
    const key = `${track.title.toLowerCase()}_${track.artist.toLowerCase()}`.replace(/[^a-z0-9_]/g, '');
    
    const existing = uniqueTracks.get(key);
    if (!existing || track.source === 'spotify') {
      uniqueTracks.set(key, track);
    }
  });

  return Array.from(uniqueTracks.values()).slice(0, 30);
}

export async function getTrackMetadataByISRC(isrc: string): Promise<UnifiedTrackMetadata | null> {
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
    if (data.tracks.items.length === 0) return null;

    const track = data.tracks.items[0];
    return {
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      albumArtist: track.album.artists[0]?.name,
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
      source: 'spotify',
    };
  } catch (error) {
    console.error('ISRC lookup error:', error);
    return null;
  }
}
