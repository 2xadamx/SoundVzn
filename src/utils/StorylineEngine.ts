import { MetadataEngine } from './MetadataEngine';
import { Track } from '../types';

export interface NarrativeStep {
    id: string;
    text: string;
    type: 'bio' | 'trivia' | 'stat';
    startTime: number; // in seconds
    duration: number; // in seconds
}

export const StorylineEngine = {
    /**
     * Generates a timeline of interesting facts and artist info for the current track.
     */
    async generateStoryline(track: Track): Promise<NarrativeStep[]> {
        try {
            const profile = await MetadataEngine.getArtistFullProfile(track.artist);
            if (!profile || !profile.bio) {
                return this.generateGenericStoryline(track);
            }

            const bioText = this.cleanBio(profile.bio.content || profile.bio.summary || '');
            const sentences = bioText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);

            const timeline: NarrativeStep[] = [];
            let currentTime = 10; // Start at 10s

            // Add bio sentences
            sentences.slice(0, 5).forEach((sentence, i) => {
                timeline.push({
                    id: `bio-${i}`,
                    text: sentence,
                    type: 'bio',
                    startTime: currentTime,
                    duration: 12
                });
                currentTime += 25; // Space them out
            });

            // Add some metadata-based trivia
            if (track.album) {
                timeline.push({
                    id: 'album-info',
                    text: `Esta canción forma parte del álbum "${track.album}", una pieza clave en la discografía de ${track.artist}.`,
                    type: 'trivia',
                    startTime: 45,
                    duration: 10
                });
            }

            if (profile.stats?.listeners) {
                timeline.push({
                    id: 'stats',
                    text: `${track.artist} tiene más de ${Number(profile.stats.listeners).toLocaleString()} oyentes globales en SoundVizion.`,
                    type: 'stat',
                    startTime: 90,
                    duration: 8
                });
            }

            return timeline.sort((a, b) => a.startTime - b.startTime);

        } catch (e) {
            console.error('Storyline generation failed:', e);
            return this.generateGenericStoryline(track);
        }
    },

    cleanBio(bio: string): string {
        // Remove Last.fm "Read more" link and HTML
        return bio.replace(/<[^>]*>/g, '').replace(/Read more on Last\.fm.*/, '').trim();
    },

    generateGenericStoryline(track: Track): NarrativeStep[] {
        return [
            {
                id: 'gen-1',
                text: `${track.artist} es un artista que define su propio sonido en la escena musical actual.`,
                type: 'bio',
                startTime: 15,
                duration: 10
            },
            {
                id: 'gen-2',
                text: `Sabías que ${track.title} ha sido una de las pistas más buscadas de esta semana?`,
                type: 'trivia',
                startTime: 60,
                duration: 10
            }
        ];
    }
};
