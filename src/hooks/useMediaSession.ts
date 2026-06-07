import { useEffect } from 'react';
import { usePlayerStore } from '../store/player';
import { MediaSessionEngine } from '../utils/MediaSessionEngine';

export const useMediaSession = () => {
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);

    useEffect(() => {
        MediaSessionEngine.registerHandlers();
    }, []);

    useEffect(() => {
        if (currentTrack) {
            MediaSessionEngine.updateMetadata(currentTrack);
        }
    }, [currentTrack]);

    useEffect(() => {
        MediaSessionEngine.updatePlaybackState();
    }, [isPlaying]);
};
