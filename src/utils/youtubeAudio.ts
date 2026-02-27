export interface YouTubeAudioInfo {
  url: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

export async function getYouTubeAudioUrl(videoId: string): Promise<YouTubeAudioInfo | null> {
  console.log(`🔍 Obteniendo metadata para video: ${videoId}`);
  
  try {
    const metadataResponse = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    
    if (!metadataResponse.ok) {
      console.error('❌ Error obteniendo metadata de noembed');
      
      return {
        url: videoId,
        title: 'YouTube Video',
        artist: 'Unknown Artist',
        duration: 0,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
    
    const metadata = await metadataResponse.json();
    
    const title = metadata.title || 'YouTube Video';
    let artist = metadata.author_name || 'Unknown Artist';

    const dashIndex = title.indexOf(' - ');
    if (dashIndex > 0 && dashIndex < title.length - 3) {
      artist = title.substring(0, dashIndex).trim();
    }

    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    
    console.log(`✅ Metadata obtenida: ${cleanTitle} - ${artist}`);
    
    return {
      url: videoId,
      title: cleanTitle,
      artist,
      duration: 0,
      thumbnail: metadata.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch (error: any) {
    console.error('❌ Error obteniendo metadata:', error.message);
    
    return {
      url: videoId,
      title: 'YouTube Video',
      artist: 'Unknown Artist',
      duration: 0,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}
