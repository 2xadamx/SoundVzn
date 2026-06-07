import { getAudioProcessor } from './audioProcessor';
import { MetadataEngine } from './MetadataEngine';
import { Track } from '../types';

export const FingerprintEngine = {
    /**
     * Generates a unique spectral signature from the currently playing audio.
     * This simulates an acoustic fingerprinting process.
     */
    async captureSignature(durationMs: number = 3000): Promise<string> {
        const ap = getAudioProcessor();
        if (!ap || !ap.analyserNode) return '';

        const bufferLength = ap.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const samples: number[][] = [];

        // Capture multiple snapshots over the duration
        const snapshotsCount = 10;
        const interval = durationMs / snapshotsCount;

        for (let i = 0; i < snapshotsCount; i++) {
            ap.analyserNode.getByteFrequencyData(dataArray);
            // Take a few key frequency points to build the "signature"
            const signaturePoints = [
                dataArray[5],   // Sub-bass
                dataArray[20],  // Mid-bass
                dataArray[100], // Mids
                dataArray[500], // Highs
            ];
            samples.push(signaturePoints);
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        // Flatten and convert to a simple "hash" string
        return btoa(samples.flat().join(',')).slice(0, 32);
    },

    /**
     * Identifies a track using its acoustic signature.
     * In a real app, this would call Audd.io or AcoustID.
     */
    async identify(signature: string): Promise<any | null> {
        console.log('🔍 FingerprintEngine: Identifying signature:', signature);

        // Simulating matching logic
        // If signature starts with certain characters, we return a "mock" match
        // In reality, this is where the API call happens.

        // For demonstration, we'll simulate a 70% success rate on "unknown" files
        if (signature.length < 10) return null;

        // Mock result
        return {
            title: "Identified Masterpiece",
            artist: "SoundVizion AI Artist",
            album: "Acoustic Memories",
            score: 0.98,
            isrc: "US-SZN-26-00041"
        };
    },

    /**
     * Full cycle: Capture -> Identify -> Enrich
     */
    async enrichUnknownTrack(track: Track): Promise<Track | null> {
        if (!track.filePath || track.title !== 'Archivo Local' && track.title !== 'Unknown') {
            return null;
        }

        console.log('🔬 FingerprintEngine: Starting acoustic analysis for:', track.id);
        const signature = await this.captureSignature(2000);
        const match = await this.identify(signature);

        if (match) {
            console.log('✅ FingerprintEngine: Match found!', match.title, 'by', match.artist);

            // Use MetadataEngine to get full details (artwork, etc)
            const fullMeta = await MetadataEngine.search(`${match.artist} ${match.title}`);
            const bestTrack = fullMeta.tracks[0];

            if (bestTrack) {
                return {
                    ...track,
                    title: bestTrack.title,
                    artist: bestTrack.artist,
                    album: bestTrack.album,
                    artwork: bestTrack.artwork?.large || track.artwork,
                    externalIds: {
                        ...track.externalIds,
                        isrc: bestTrack.isrc,
                        spotify: bestTrack.externalIds?.spotify,
                        deezer: bestTrack.externalIds?.deezer
                    }
                };
            }
        }

        return null;
    }
};
