import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/player';

export const Visualizer: React.FC<{ className?: string }> = ({ className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyser = usePlayerStore((state) => state.analyser);
    const isPlaying = usePlayerStore((state) => state.isPlaying);
    const animationRef = useRef<number>();

    useEffect(() => {
        let isMounted = true;
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!isMounted) return;
            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            // REINFORCEMENT: Symmetric High-Fidelity Rendering
            const barWidth = (width / (bufferLength / 2)) * 1.2;
            let barHeight;
            let x = width / 2;
            let xRev = width / 2;

            for (let i = 0; i < bufferLength / 2; i++) {
                barHeight = (dataArray[i] / 255) * height;
                const opacity = (dataArray[i] / 255) * 0.8;
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity + 0.1})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `rgba(79, 70, 229, ${opacity})`;

                const radius = 1;
                ctx.beginPath();
                ctx.roundRect(x, height - barHeight, Math.max(0.5, barWidth - 1.5), barHeight, radius);
                ctx.fill();
                
                ctx.beginPath();
                ctx.roundRect(xRev - barWidth, height - barHeight, Math.max(0.5, barWidth - 1.5), barHeight, radius);
                ctx.fill();

                x += barWidth;
                xRev -= barWidth;
            }
        };

        draw();

        return () => {
            isMounted = false;
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
