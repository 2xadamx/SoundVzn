import React, { useEffect, useRef } from 'react';
import { getAudioProcessor } from '../utils/audioProcessor';

interface FrequencyVisualizerProps {
    className?: string;
    barColor?: string;
    gap?: number;
    barCount?: number;
}

export const FrequencyVisualizer: React.FC<FrequencyVisualizerProps> = ({
    className = "",
    barColor = "#0ea5e9",
    gap = 2,
    barCount = 64
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        const processor = getAudioProcessor();
        if (!processor || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const analyser = processor.analyserNode;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const render = () => {
            animationRef.current = requestAnimationFrame(render);
            analyser.getByteFrequencyData(dataArray);

            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const barWidth = (width / barCount) - gap;
            let x = 0;

            for (let i = 0; i < barCount; i++) {
                // Focus on lower/middle frequencies for better visual impact
                const index = Math.floor((i / barCount) * (bufferLength / 2));
                const value = dataArray[index];
                const barHeight = (value / 255) * height;

                // Gradient for bars
                const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                gradient.addColorStop(0, barColor);
                gradient.addColorStop(1, `${barColor}66`); // Transparent version

                ctx.fillStyle = gradient;

                // Rounded bar effect
                const radius = barWidth / 2;
                if (barHeight > radius) {
                    ctx.beginPath();
                    ctx.roundRect(x, height - barHeight, barWidth, barHeight, [radius, radius, 0, 0]);
                    ctx.fill();
                }

                x += barWidth + gap;
            }
        };

        render();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [barColor, gap, barCount]);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full h-full ${className}`}
            width={800}
            height={200}
        />
    );
};
