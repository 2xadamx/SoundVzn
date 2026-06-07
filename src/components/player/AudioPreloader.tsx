import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/player';

/**
 * AudioPreloader — Precarga inteligente de la siguiente pista.
 * Activa el preload cuando queda un 30% de la canción actual o menos de 45 segundos.
 * Para tracks de YouTube: resuelve el filePath con antelación y lo inyecta en la cola.
 * Para tracks locales: usa un <audio> oculto con preload="metadata".
 */
export const AudioPreloader = () => {
    const currentTrack  = usePlayerStore(s => s.currentTrack);
    const queue         = usePlayerStore(s => s.queue);
    const currentIndex  = usePlayerStore(s => s.currentIndex);
    const currentTime   = usePlayerStore(s => s.currentTime);
    const duration      = usePlayerStore(s => s.duration);
    const setQueue      = usePlayerStore(s => s.setQueue);

    const lastPreloadedId  = useRef<string | null>(null);
    const preloadAudioRef  = useRef<HTMLAudioElement | null>(null);

    // Crear el elemento de audio oculto una sola vez
    useEffect(() => {
        const audio = new Audio();
        audio.preload = 'metadata';
        preloadAudioRef.current = audio;
        return () => {
            audio.src = '';
            audio.load();
        };
    }, []);

    useEffect(() => {
        if (!currentTrack || !duration || duration <= 0) return;

        // Activar preload cuando queda 30% o menos de 45s
        const timeLeft = duration - currentTime;
        const percentLeft = timeLeft / duration;
        const shouldPreload = percentLeft <= 0.3 || timeLeft <= 45;

        if (!shouldPreload) return;

        const nextIndex = currentIndex + 1;
        const nextTrack = queue[nextIndex];
        if (!nextTrack || nextTrack.id === lastPreloadedId.current) return;

        lastPreloadedId.current = nextTrack.id;

        // Si ya tiene filePath resuelto, precargar con audio element
        if (nextTrack.filePath && nextTrack.filePath.startsWith('http')) {
            if (preloadAudioRef.current) {
                preloadAudioRef.current.src = nextTrack.filePath;
                preloadAudioRef.current.load();
            }
            return;
        }

        // Si es un track de YouTube sin resolver, resolverlo en background
        const youtubeId = nextTrack.externalIds?.youtubeId ||
            (typeof nextTrack.id === 'string' && nextTrack.id.length === 11 ? nextTrack.id : null);

        if (youtubeId || !nextTrack.filePath) {
            import('../../utils/MetadataEngine').then(async ({ MetadataEngine }) => {
                try {
                    const resolved = await MetadataEngine.resolvePlayableTrack(nextTrack);
                    if (!resolved) return;

                    // Inyectar el track resuelto en la cola para que esté listo
                    const currentQueue = usePlayerStore.getState().queue;
                    const idx = currentQueue.findIndex(t => t.id === nextTrack.id);
                    if (idx !== -1 && usePlayerStore.getState().currentIndex !== idx) {
                        const newQueue = [...currentQueue];
                        newQueue[idx] = resolved;
                        setQueue(newQueue);
                        console.log(`[Preloader] Pre-resolved: ${resolved.title}`);
                    }

                    // Precargar el audio
                    if (resolved.filePath && preloadAudioRef.current) {
                        preloadAudioRef.current.src = resolved.filePath;
                        preloadAudioRef.current.load();
                    }
                } catch {
                    // Silencioso — el preload es best-effort
                }
            }).catch(() => {});
        }
    }, [
        // Solo re-ejecutar cuando cambia el segundo actual (throttle natural)
        Math.floor(currentTime),
        currentIndex,
        currentTrack?.id,
        duration,
    ]);

    return null;
};
