import { Track } from '../types';
import { usePlayerStore } from '../store/player';
import { searchTracks } from './database';

export const MoodRadioEngine = {
    /**
     * Generates a dynamic queue based on a seed track or mood.
     */
    async startRadio(seedTrack: Track) {
        console.log('📻 MoodRadio: Starting radio for:', seedTrack.title);

        const { setQueue, setCurrentIndex, setIsRadioMode } = usePlayerStore.getState();

        // 1. Find tracks with similar genre or artist
        const searchTag = seedTrack.genre || seedTrack.artist || 'all';
        const recommendations = await searchTracks(searchTag, {
            limit: 30
        });

        // 2. Filter and shuffle
        const radioQueue = [seedTrack, ...recommendations.filter(t => t.id !== seedTrack.id)]
            .sort(() => Math.random() - 0.5);

        // 3. Set the new queue and mode
        setQueue(radioQueue);
        setCurrentIndex(0);
        setIsRadioMode(true);

        return radioQueue;
    },

    /**
     * Logic to extend the radio when the queue is near the end.
     */
    async extendRadio() {
        const { queue, currentTrack, addToQueue, isRadioMode } = usePlayerStore.getState();
        if (!currentTrack || !isRadioMode) return;

        console.log('📻 MoodRadio: Extending radio queue...');

        const moreTracks = await searchTracks(currentTrack.genre || 'all', {
            limit: 20
        });

        const existingIds = new Set(queue.map(t => t.id));
        const newTracks = moreTracks.filter(t => !existingIds.has(t.id));

        if (newTracks.length > 0) {
            addToQueue(newTracks);
        }
    }
};
