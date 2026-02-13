import { getYouTubeAPIKey } from './apiConfig';

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  viewCount?: string;
  publishedAt: string;
}

export async function searchYouTubeMusic(query: string, maxResults: number = 20): Promise<YouTubeSearchResult[]> {
  try {
    const apiKey = getYouTubeAPIKey();
    
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${apiKey}`
    );

    if (!searchResponse.ok) {
      throw new Error('YouTube API error');
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${apiKey}`
    );

    if (!videosResponse.ok) {
      throw new Error('YouTube API error fetching video details');
    }

    const videosData = await videosResponse.json();

    const results: YouTubeSearchResult[] = searchData.items.map((item: any, index: number) => {
      const videoDetails = videosData.items[index];
      
      const channelTitle = item.snippet.channelTitle;
      let artist = channelTitle;
      let title = item.snippet.title;

      const dashIndex = title.indexOf(' - ');
      if (dashIndex > 0 && dashIndex < title.length - 3) {
        artist = title.substring(0, dashIndex).trim();
        title = title.substring(dashIndex + 3).trim();
      }

      title = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

      return {
        videoId: item.id.videoId,
        title,
        artist,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
        duration: videoDetails?.contentDetails?.duration || 'PT0S',
        viewCount: videoDetails?.statistics?.viewCount,
        publishedAt: item.snippet.publishedAt,
      };
    });

    return results;
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export async function getYouTubeVideoInfo(videoId: string): Promise<{
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  streamUrl: string;
} | null> {
  try {
    const apiKey = getYouTubeAPIKey();
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;

    const video = data.items[0];
    
    let title = video.snippet.title;
    let artist = video.snippet.channelTitle;

    const dashIndex = title.indexOf(' - ');
    if (dashIndex > 0) {
      artist = title.substring(0, dashIndex).trim();
      title = title.substring(dashIndex + 3).trim();
    }

    title = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

    return {
      title,
      artist,
      duration: parseDuration(video.contentDetails.duration),
      thumbnail: video.snippet.thumbnails.high?.url,
      streamUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch (error) {
    console.error('YouTube video info error:', error);
    return null;
  }
}

export async function getYouTubeTrendingMusic(maxResults: number = 20): Promise<YouTubeSearchResult[]> {
  try {
    const apiKey = getYouTubeAPIKey();
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&videoCategoryId=10&maxResults=${maxResults}&regionCode=US&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('YouTube API error');
    }

    const data = await response.json();

    return data.items.map((item: any) => ({
      videoId: item.id,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.high?.url,
      duration: item.contentDetails.duration,
      viewCount: item.statistics.viewCount,
      publishedAt: item.snippet.publishedAt,
    }));
  } catch (error) {
    console.error('YouTube trending error:', error);
    return [];
  }
}
