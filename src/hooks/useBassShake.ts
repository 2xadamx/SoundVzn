import { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/player';

export const useBassShake = (intensity: number = 8) => {
    const analyser = usePlayerStore(state => state.analyser);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const hapticFeedback = usePlayerStore(state => state.hapticFeedback);

    const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
    const requestRef = useRef<number>();

    useEffect(() => {
        // Stop shaking immediately if turned off or stopped
        if (!hapticFeedback || !isPlaying || !analyser) {
            setShakeOffset({ x: 0, y: 0 });
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            return;
        }

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateShake = () => {
            analyser.getByteFrequencyData(dataArray);

            // Sub-bass frequency range (approx 20Hz-60Hz)
            // With a typical FFT size of 2048 at 44.1kHz, each bin is ~21Hz.
            // Bins 1 to 3 map to ~21Hz to 64Hz
            let bassSum = 0;
            const bassBins = 4;
            for (let i = 1; i <= bassBins; i++) {
                bassSum += dataArray[i];
            }

            // Average amplitude (normalized 0 to 1)
            const bassAvg = (bassSum / bassBins) / 255;

            // Threshold for triggering the "drop" shake
            const BASS_THRESHOLD = 0.85;

            if (bassAvg > BASS_THRESHOLD) {
                // Map remaining 0.15 amplitude into a robust multiplier
                const factor = (bassAvg - BASS_THRESHOLD) / (1 - BASS_THRESHOLD);

                // Random micro-offset physics for realistic vibration
                const x = (Math.random() - 0.5) * 2 * intensity * factor;
                const y = (Math.random() - 0.5) * 2 * intensity * factor;

                setShakeOffset({ x, y });
            } else {
                // Smooth decay
                setShakeOffset(prev => {
                    if (Math.abs(prev.x) > 0.1 || Math.abs(prev.y) > 0.1) {
                        return { x: prev.x * 0.5, y: prev.y * 0.5 }; // Decay
                    }
                    return { x: 0, y: 0 };
                });
            }

            requestRef.current = requestAnimationFrame(updateShake);
        };

        requestRef.current = requestAnimationFrame(updateShake);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            setShakeOffset({ x: 0, y: 0 });
        };
    }, [analyser, isPlaying, hapticFeedback, intensity]);

    return shakeOffset;
};
