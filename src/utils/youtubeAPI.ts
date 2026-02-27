import { BACKEND_URL } from './apiConfig';

export interface YouTubeSearchResult {
  id: string;
  videoId: string;
  title: string;
  artist?: string;
  thumbnail: string;
  duration: string;
  source: 'youtube';
}

export async function searchYouTubeMusic(query: string, maxResults: number = 10): Promise<YouTubeSearchResult[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/youtube/search?q=${encodeURIComponent(query)}&limit=${maxResults}`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return (data.results || []).map((result: any) => ({
      id: result.videoId,
      videoId: result.videoId,
      title: result.title,
      artist: result.channel || result.author,
      thumbnail: result.thumbnail || '',
      duration: result.duration || 'N/A',
      source: 'youtube',
    }));
  } catch (error) {
    console.warn('Backend searchYouTubeMusic error:', (error as any)?.message || error);
    return [];
  }
}

export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(duration: string): string {
  const totalSeconds = parseDuration(duration);
  if (totalSeconds === 0) return '0:00';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
