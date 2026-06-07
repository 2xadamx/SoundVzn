import { usePlayerStore } from '../store/player';
import { Track } from '../types';

export const MediaSessionEngine = {
    /**
     * Updates the system media metadata (title, artist, album, artwork).
     */
    updateMetadata(track: Track) {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album,
            artwork: [
                { src: track.artwork || '', sizes: '512x512', type: 'image/png' },
                { src: track.artwork || '', sizes: '256x256', type: 'image/png' },
                { src: track.artwork || '', sizes: '128x128', type: 'image/png' },
            ]
        });

        this.updatePlaybackState();
    },

    /**
     * Updates the playback state (playing/paused) in the system.
     */
    updatePlaybackState() {
        if (!('mediaSession' in navigator)) return;

        const isPlaying = usePlayerStore.getState().isPlaying;
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    },

    /**
     * Registers handlers for system media keys (Play, Pause, Next, Previous).
     */
    registerHandlers() {
        if (!('mediaSession' in navigator)) return;

        const store = usePlayerStore.getState();

        navigator.mediaSession.setActionHandler('play', () => store.setIsPlaying(true));
        navigator.mediaSession.setActionHandler('pause', () => store.setIsPlaying(false));
        navigator.mediaSession.setActionHandler('previoustrack', () => store.playPrevious());
        navigator.mediaSession.setActionHandler('nexttrack', () => store.playNext());

        // Seek handlers if needed
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined) {
                store.setSeekTo(details.seekTime);
            }
        });
    }
};
