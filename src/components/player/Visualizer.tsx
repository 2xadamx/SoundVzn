import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/player';

export const Visualizer: React.FC<{ className?: string }> = ({ className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyser = usePlayerStore((state) => state.analyser);
    const isPlaying = usePlayerStore((state) => state.isPlaying);
    const animationRef = useRef<number>();

    useEffect(() => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const barWidth = (width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * height;

                // Create a nice gradient based on CSS variables
                const gradient = ctx.createLinearGradient(0, height, 0, 0);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0.6)');

                ctx.fillStyle = gradient;

                // Rounded bars
                const radius = 2;
                const barX = x;
                const barY = height - barHeight;
                ctx.beginPath();
                ctx.roundRect(barX, barY, barWidth - 1, barHeight, radius);
                ctx.fill();

                x += barWidth;
            }
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [analyser, isPlaying]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            width={128} // Small width for the preview in PlayerBar
            height={32}
        />
    );
};
