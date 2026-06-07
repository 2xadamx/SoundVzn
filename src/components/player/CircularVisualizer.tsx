import React, { useRef, useEffect } from 'react';
import { getAudioProcessor } from '../../utils/audioProcessor';

interface CircularVisualizerProps {
    isPlaying: boolean;
    size?: number;
}

export const CircularVisualizer: React.FC<CircularVisualizerProps> = ({ isPlaying, size = 500 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const processor = getAudioProcessor();
        if (!processor) return;

        const analyser = processor.analyserNode;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!isPlaying) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                requestRef.current = requestAnimationFrame(draw);
                return;
            }

            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = (size / 2) - 40; // Leave space for bars

            const barCount = 120;
            const angleStep = (Math.PI * 2) / barCount;

            for (let i = 0; i < barCount; i++) {
                // Focus on mid-high frequencies for the "energy ring" effect
                // We'll skip the very low bass as they are represented by the "shake" already
                const dataIndex = Math.floor((i / barCount) * (bufferLength / 2)) + 10;
                const value = dataArray[dataIndex] || 0;

                // Sensitivity adjustment
                const barHeight = (value / 255) * 60;

                const angle = i * angleStep;

                const xStart = centerX + Math.cos(angle) * radius;
                const yStart = centerY + Math.sin(angle) * radius;

                const xEnd = centerX + Math.cos(angle) * (radius + barHeight);
                const yEnd = centerY + Math.sin(angle) * (radius + barHeight);

                // Gradient / Color effect
                const hue = (i / barCount) * 360;
                ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.3 + (value / 255) * 0.7})`;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';

                ctx.beginPath();
                ctx.moveTo(xStart, yStart);
                ctx.lineTo(xEnd, yEnd);
                ctx.stroke();

                // Add a small glow point at the end of the bar
                if (value > 150) {
                    ctx.fillStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
                    ctx.beginPath();
                    ctx.arc(xEnd, yEnd, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            requestRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isPlaying, size]);

    return (
        <canvas
            ref={canvasRef}
            width={size + 100}
            height={size + 100}
            className="absolute pointer-events-none z-0"
            style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))'
            }}
        />
    );
};
