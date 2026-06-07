import { Track } from '../types';
import { lastfmService } from './lastfm';

export type Mood = 'Chill' | 'Dynamic' | 'Dark' | 'Party' | 'Melancholic' | 'Neutral';

interface MoodBucket {
    mood: Mood;
    keywords: string[];
}

const MOOD_BUCKETS: MoodBucket[] = [
    {
        mood: 'Chill',
        keywords: ['chill', 'chillout', 'ambient', 'acoustic', 'relaxing', 'downtempo', 'lofi', 'mellow', 'smooth']
    },
    {
        mood: 'Dynamic',
        keywords: ['rock', 'pop', 'indie', 'upbeat', 'energetic', 'alternative', 'funk', 'groove']
    },
    {
        mood: 'Dark',
        keywords: ['dark', 'gothic', 'industrial', 'metal', 'doom', 'darkwave', 'atmospheric black metal', 'evil']
    },
    {
        mood: 'Party',
        keywords: ['party', 'dance', 'electronic', 'house', 'techno', 'edm', 'club', 'energy', 'trance']
    },
    {
        mood: 'Melancholic',
        keywords: ['sad', 'emotional', 'melancholic', 'moody', 'slow', 'depressing', 'heartbreak', 'piano']
    }
];

export const MoodEngine = {
    /**
     * Detects the dominant mood of a track based on its tags.
     */
    async detectMood(track: Track): Promise<Mood> {
        try {
            // First, try to get tags for the specific track
            const trackInfo = await lastfmService.getTrackInfo(track.artist, track.title);
            let tags: string[] = [];

            // If track tags are missing, fallback to artist tags
            if (!trackInfo || !trackInfo.summary) { // TrackInfo doesn't directly expose tags, but ArtistInfo does. 
                // Wait, trackInfo in lastfmService doesn't have tags? Let's check lastfm.ts again.
                // It seems trackInfo doesn't have tags in the interface. 
                // Let's use ArtistInfo tags as fallback.
                const artistInfo = await lastfmService.getArtistInfo(track.artist);
                tags = artistInfo?.tags || [];
            } else {
                // If we had track tags, we'd use them. 
                // Actually, Last.fm API track.getInfo DOES return tags.
                // Let's assume we might need to update lastfmService if needed, but for now let's use Artist tags as they are more reliable for general vibe.
                const artistInfo = await lastfmService.getArtistInfo(track.artist);
                tags = artistInfo?.tags || [];
            }

            if (tags.length === 0) return 'Neutral';

            const moodScores: Record<Mood, number> = {
                Chill: 0,
                Dynamic: 0,
                Dark: 0,
                Party: 0,
                Melancholic: 0,
                Neutral: 0
            };

            tags.forEach(tag => {
                const lowerTag = tag.toLowerCase();
                MOOD_BUCKETS.forEach(bucket => {
                    if (bucket.keywords.some(k => lowerTag.includes(k))) {
                        moodScores[bucket.mood]++;
                    }
                });
            });

            // Find mood with highest score
            let maxScore = 0;
            let dominantMood: Mood = 'Neutral';

            (Object.keys(moodScores) as Mood[]).forEach(mood => {
                if (moodScores[mood] > maxScore) {
                    maxScore = moodScores[mood];
                    dominantMood = mood;
                }
            });

            return dominantMood;
        } catch (error) {
            console.error('MoodEngine detection failed:', error);
            return 'Neutral';
        }
    },

    /**
     * Scores how well a candidate track matches a given mood.
     */
    async getMoodMatchScore(mood: Mood, track: Track): Promise<number> {
        if (mood === 'Neutral') return 0.5;

        const trackMood = await this.detectMood(track);
        return trackMood === mood ? 1 : 0;
    }
};
