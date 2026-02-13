const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY_HERE';
const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';
const SPOTIFY_CLIENT_SECRET = 'YOUR_SPOTIFY_CLIENT_SECRET';

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  source: 'youtube' | 'local';
  url?: string;
}

export async function searchYouTube(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('YouTube API error');
    }

    const data = await response.json();
    
    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      duration: 0,
      thumbnail: item.snippet.thumbnails.high.url,
      source: 'youtube' as const,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return [];
  }
}

export async function getSpotifyAccessToken(): Promise<string> {
  const credentials = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

export async function importSpotifyPlaylist(playlistUrl: string): Promise<{
  name: string;
  description: string;
  tracks: Array<{ title: string; artist: string; album: string; duration: number }>;
}> {
  try {
    const playlistId = playlistUrl.split('/playlist/')[1]?.split('?')[0];
    if (!playlistId) {
      throw new Error('Invalid Spotify playlist URL');
    }

    const token = await getSpotifyAccessToken();

    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!playlistResponse.ok) {
      throw new Error('Failed to fetch Spotify playlist');
    }

    const playlistData = await playlistResponse.json();

    const tracks = playlistData.tracks.items.map((item: any) => ({
      title: item.track.name,
      artist: item.track.artists.map((a: any) => a.name).join(', '),
      album: item.track.album.name,
      duration: Math.floor(item.track.duration_ms / 1000),
      artwork: item.track.album.images[0]?.url,
    }));

    return {
      name: playlistData.name,
      description: playlistData.description || '',
      tracks,
    };
  } catch (error) {
    console.error('Error importing Spotify playlist:', error);
    throw error;
  }
}

export async function searchSpotify(query: string): Promise<SearchResult[]> {
  try {
    const token = await getSpotifyAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Spotify API error');
    }

    const data = await response.json();

    return data.tracks.items.map((track: any) => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      duration: Math.floor(track.duration_ms / 1000),
      thumbnail: track.album.images[0]?.url || '',
      source: 'youtube' as const,
      url: track.external_urls.spotify,
    }));
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return [];
  }
}

export async function downloadTrackFromYouTube(
  videoId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  console.warn('YouTube download requires backend server with ytdl-core or similar');
  console.log('Video ID to download:', videoId);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('mock_file_path.mp3');
    }, 2000);
  });
}

export async function searchMultipleSources(query: string): Promise<SearchResult[]> {
  const [youtubeResults, spotifyResults] = await Promise.all([
    searchYouTube(query),
    searchSpotify(query),
  ]);

  const uniqueResults = new Map<string, SearchResult>();
  
  [...youtubeResults, ...spotifyResults].forEach((result) => {
    const key = `${result.title.toLowerCase()}_${result.artist.toLowerCase()}`;
    if (!uniqueResults.has(key)) {
      uniqueResults.set(key, result);
    }
  });

  return Array.from(uniqueResults.values()).slice(0, 30);
}
