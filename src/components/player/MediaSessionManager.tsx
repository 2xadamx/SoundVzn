/**
 * MediaSessionManager — Media Session API integration for mobile
 * Shows track info + controls on lock screen and notification bar (iOS Safari, Android Chrome)
 * Also enables background audio playback.
 */
import React, { useEffect } from 'react';
import { usePlayerStore } from '../../store/player';

export const MediaSessionManager: React.FC = () => {
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const setIsPlaying = usePlayerStore(s => s.setIsPlaying);
    const playNext = usePlayerStore(s => s.playNext);
    const playPrevious = usePlayerStore(s => s.playPrevious);

    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        if (!currentTrack) return;

        const artwork = typeof currentTrack.artwork === 'string' ? currentTrack.artwork : '';

        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title || 'SoundVzn',
            artist: currentTrack.artist || '',
            album: currentTrack.album || 'SoundVzn',
            artwork: artwork ? [
                { src: artwork, sizes: '512x512', type: 'image/jpeg' },
                { src: artwork, sizes: '256x256', type: 'image/jpeg' },
            ] : [],
        });
    }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.artwork]);

    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

        navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
        navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
        navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
        navigator.mediaSession.setActionHandler('stop', () => setIsPlaying(false));

        return () => {
            try {
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
                navigator.mediaSession.setActionHandler('nexttrack', null);
                navigator.mediaSession.setActionHandler('previoustrack', null);
                navigator.mediaSession.setActionHandler('stop', null);
            } catch {}
        };
    }, [isPlaying, setIsPlaying, playNext, playPrevious]);

    return null;
};

export default MediaSessionManager;
