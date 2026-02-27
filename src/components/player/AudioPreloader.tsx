import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/player';
import { shallow } from 'zustand/shallow';

/**
 * AudioPreloader — Gestión inteligente de caché anticipada.
 * Activa el preload cuando falta un 30% de la canción actual o los últimos 45 segundos.
 * Se anticipa mucho más para evitar esperas entre pistas.
 */
export const AudioPreloader = () => {
    const { currentTrack, queue, currentIndex, currentTime, duration } = usePlayerStore(
        (state) => ({
            currentTrack: state.currentTrack,
            queue: state.queue,
            currentIndex: state.currentIndex,
            currentTime: state.currentTime,
            duration: state.duration,
        }),
        shallow
    );
    const lastPreloadedId = useRef<string | null>(null);

    useEffect(() => {
        if (!currentTrack || !duration || duration <= 0) return;

        // Configuration: Preload agressively
        // We preload as soon as the current track is playing (more than 2 seconds)
        // to ensure the next one is ready whenever the user skips or it ends.
        if (currentTime > 2) {
            const nextIndex = currentIndex + 1;
            const nextTrack = queue[nextIndex];

            if (nextTrack && nextTrack.id !== lastPreloadedId.current) {
                // Determine source
                const videoId = nextTrack.externalIds?.youtubeId || (nextTrack.id.length === 11 ? nextTrack.id : null);

                if (videoId) {
                    console.log(`🚀 Preloading NEXT track (aggressive): ${nextTrack.title} (${videoId})`);
                    lastPreloadedId.current = nextTrack.id;

                    // Send preload hint to the backend
                    fetch(`http://localhost:3000/api/youtube/stream/${videoId}/preload`)
                        .then(res => res.json())
                        .then(data => {
                            if (data.available) {
                                console.log(`✅ Preload cached successfully: ${nextTrack.title}`);
                            }
                        })
                        .catch(err => console.warn(`❌ Preload hint failed for ${nextTrack.title}:`, err));
                }
            }
        }
    }, [currentTime, duration, currentIndex, queue, currentTrack]);

    return null;
};
