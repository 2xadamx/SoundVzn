import { extractMetadata } from './metadata';
import { searchUnifiedMultiSource, getTrackMetadataByISRC } from './unifiedMusicAPI';
import { UnifiedTrackMetadata } from '../types';
import { getCachedSearch, setCachedSearch, setCachedMetadata } from './cacheManager';
import { addTrack, getAllTracks } from './database';

export async function enrichLocalTrack(filePath: string): Promise<void> {
  try {
    const localMetadata = await extractMetadata(filePath);

    if ((localMetadata as any).isrc) {
      const onlineMetadata = await getTrackMetadataByISRC((localMetadata as any).isrc);
      if (onlineMetadata) {
        await mergeAndSaveMetadata(filePath, localMetadata, onlineMetadata as any);
        return;
      }
    }

    const searchQuery = `${localMetadata.artist} ${localMetadata.title}`;

    const cached = await getCachedSearch(searchQuery, 'unified');
    let results: UnifiedTrackMetadata[] = [];

    if (cached) {
      results = cached;
    } else {
      results = await searchUnifiedMultiSource(searchQuery);
      if (results.length > 0) {
        await setCachedSearch(searchQuery, 'unified', results);
      }
    }

    if (results.length > 0) {
      const bestMatch = findBestMatch(localMetadata, results);
      if (bestMatch) {
        await mergeAndSaveMetadata(filePath, localMetadata, bestMatch);
        return;
      }
    }

    await addTrack({
      id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...localMetadata,
      filePath,
      addedDate: new Date(),
      playCount: 0,
    });

  } catch (error) {
    console.error('Error enriching track:', error);
  }
}

function findBestMatch(
  local: any,
  candidates: UnifiedTrackMetadata[]
): UnifiedTrackMetadata | null {
  const localTitle = local.title.toLowerCase().trim();
  const localArtist = local.artist.toLowerCase().trim();

  let bestScore = 0;
  let bestMatch: UnifiedTrackMetadata | null = null;

  for (const candidate of candidates) {
    const candidateTitle = candidate.title.toLowerCase().trim();
    const candidateArtist = candidate.artist.toLowerCase().trim();

    let score = 0;

    if (candidateTitle === localTitle) score += 50;
    else if (candidateTitle.includes(localTitle) || localTitle.includes(candidateTitle)) score += 30;
    else if (similarity(candidateTitle, localTitle) > 0.7) score += 20;

    if (candidateArtist === localArtist) score += 50;
    else if (candidateArtist.includes(localArtist) || localArtist.includes(candidateArtist)) score += 30;
    else if (similarity(candidateArtist, localArtist) > 0.7) score += 20;

    if (local.duration && candidate.duration) {
      const durationDiff = Math.abs(local.duration - candidate.duration);
      if (durationDiff < 5) score += 10;
      else if (durationDiff > 30) score -= 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestScore > 50 ? bestMatch : null;
}

function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

async function mergeAndSaveMetadata(
  filePath: string,
  local: any,
  online: UnifiedTrackMetadata
): Promise<void> {
  const merged = {
    id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: online.title || local.title,
    artist: online.artist || local.artist,
    album: online.album || local.album,
    year: online.year || local.year,
    genre: online.genre?.[0] || local.genre,
    duration: local.duration,
    filePath,
    format: local.format,
    bitrate: local.bitrate,
    sampleRate: local.sampleRate,
    bitDepth: local.bitDepth,
    lossless: local.lossless,
    artwork: online.artwork.large || online.artwork.medium || local.artwork,
    isrc: online.isrc,
    externalIds: online.externalIds,
    popularity: online.popularity,
    addedDate: new Date(),
    playCount: 0,
  };

  await addTrack(merged);

  if (online.externalIds.spotify) {
    await setCachedMetadata(online.externalIds.spotify, online);
  }
}

export async function enrichAllLocalTracks(): Promise<void> {
  const tracks = await getAllTracks();

  console.log(`Enriching ${tracks.length} tracks...`);

  for (const track of tracks) {
    if (!track.externalIds || Object.keys(track.externalIds).length === 0) {
      try {
        await enrichLocalTrack(track.filePath);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error enriching ${track.title}:`, error);
      }
    }
  }

  console.log('Enrichment complete!');
}

export async function downloadHighResArtwork(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Artwork download error:', error);
    return null;
  }
}
