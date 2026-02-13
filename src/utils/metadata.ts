

export interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  duration: number;
  format: string;
  bitrate?: number;
  sampleRate?: number;
  bitDepth?: number;
  codec?: string;
  lossless: boolean;
  artwork?: string;
}

export async function extractMetadata(filePath: string): Promise<AudioMetadata> {
  try {
    const metadata = await window.electron.readMetadata(filePath);

    if (!metadata) {
      throw new Error('Failed to read metadata');
    }

    return metadata;
  } catch (error) {
    console.error('Error extracting metadata:', error);
    // Return a fallback object instead of crashing
    return {
      title: filePath.split(/[\\/]/).pop() || 'Unknown Title',
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      duration: 0,
      format: filePath.split('.').pop()?.toUpperCase() || 'UNKNOWN',
      lossless: false,
    };
  }
}

export function getAudioQualityLabel(metadata: AudioMetadata): string {
  if (!metadata.sampleRate) return 'Standard';

  const sampleRate = metadata.sampleRate;
  const bitDepth = metadata.bitDepth || 16;

  if (metadata.lossless && sampleRate >= 192000 && bitDepth >= 24) {
    return 'Hi-Res Lossless (24-bit/192kHz)';
  } else if (metadata.lossless && sampleRate >= 96000) {
    return 'Hi-Res Lossless (24-bit/96kHz)';
  } else if (metadata.lossless) {
    return 'Lossless (16-bit/44.1kHz)';
  } else if (metadata.bitrate && metadata.bitrate >= 320000) {
    return 'High Quality (320kbps)';
  } else {
    return 'Standard Quality';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
