import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/player';
import { Mood } from '../../types';

interface AtmosphereConfig {
    blobs: Array<{
        x: number;
        y: number;
        size: number;
        speed: number;
        color: string;
        phase: number;
    }>;
    starsOpacity: number;
    bgAlpha: number;
    blurAmount: number;
}

const ATMOSPHERES: Record<Mood, AtmosphereConfig> = {
    'Chill': {
        blobs: [
            { x: 0.1, y: 0.2, size: 0.6, speed: 0.0005, color: '16, 185, 129', phase: 0 }, // Green
            { x: 0.9, y: 0.1, size: 0.5, speed: 0.0007, color: '14, 165, 233', phase: Math.PI / 2 }, // Blue
            { x: 0.5, y: 0.9, size: 0.7, speed: 0.0004, color: '20, 184, 166', phase: Math.PI }, // Teal
        ],
        starsOpacity: 0.3,
        bgAlpha: 0.05,
        blurAmount: 140
    },
    'Dynamic': {
        blobs: [
            { x: 0.2, y: 0.3, size: 0.4, speed: 0.0015, color: '139, 92, 246', phase: 0 }, // Purple
            { x: 0.8, y: 0.7, size: 0.5, speed: 0.0012, color: '236, 72, 153', phase: Math.PI / 2 }, // Pink
            { x: 0.5, y: 0.1, size: 0.45, speed: 0.0018, color: '14, 165, 233', phase: Math.PI }, // Blue
        ],
        starsOpacity: 0.6,
        bgAlpha: 0.08,
        blurAmount: 100
    },
    'Dark': {
        blobs: [
            { x: 0.5, y: 0.5, size: 0.8, speed: 0.0003, color: '30, 58, 138', phase: 0 }, // Dark Blue
            { x: 0.1, y: 0.9, size: 0.6, speed: 0.0002, color: '88, 28, 135', phase: Math.PI / 2 }, // Dark Purple
        ],
        starsOpacity: 0.2,
        bgAlpha: 0.03,
        blurAmount: 160
    },
    'Party': {
        blobs: [
            { x: 0.1, y: 0.1, size: 0.3, speed: 0.004, color: '244, 63, 94', phase: 0 }, // Rose
            { x: 0.9, y: 0.9, size: 0.3, speed: 0.0045, color: '234, 179, 8', phase: Math.PI / 2 }, // Yellow
            { x: 0.9, y: 0.1, size: 0.3, speed: 0.0035, color: '34, 197, 94', phase: Math.PI }, // Green
            { x: 0.1, y: 0.9, size: 0.3, speed: 0.005, color: '14, 165, 233', phase: Math.PI * 1.5 }, // Blue
        ],
        starsOpacity: 0.8,
        bgAlpha: 0.12,
        blurAmount: 80
    },
    'Melancholic': {
        blobs: [
            { x: 0.8, y: 0.2, size: 0.7, speed: 0.0004, color: '249, 115, 22', phase: 0 }, // Orange
            { x: 0.2, y: 0.8, size: 0.6, speed: 0.0003, color: '156, 163, 175', phase: Math.PI / 2 }, // Gray/Silver
            { x: 0.5, y: 0.5, size: 0.8, speed: 0.0002, color: '127, 29, 29', phase: Math.PI }, // Deep Red
        ],
        starsOpacity: 0.15,
        bgAlpha: 0.04,
        blurAmount: 150
    },
    'Neutral': {
        blobs: [
            { x: 0.2, y: 0.3, size: 0.4, speed: 0.001, color: '14, 165, 233', phase: 0 },
            { x: 0.8, y: 0.2, size: 0.5, speed: 0.0012, color: '139, 92, 246', phase: Math.PI / 2 },
            { x: 0.5, y: 0.8, size: 0.45, speed: 0.0008, color: '20, 184, 166', phase: Math.PI },
        ],
        starsOpacity: 0.4,
        bgAlpha: 0.06,
        blurAmount: 120
    }
};

export const PremiumAmbientAura: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyser = usePlayerStore((state) => state.analyser);
    const isPlaying = usePlayerStore((state) => state.isPlaying);
    const currentMood = usePlayerStore((state) => state.currentMood) || 'Neutral';
    const animationRef = useRef<number>();

    // Current interpolation state for smooth transitions
    const interpolationRef = useRef({
        targetMood: currentMood,
        alpha: 1.0,
    });

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const bufferLength = analyser?.frequencyBinCount || 2048;
        const dataArray = new Uint8Array(bufferLength);

        // Persistent stars
        const stars = Array.from({ length: 200 }, () => ({
            x: Math.random() * 2000,
            y: Math.random() * 2000,
            size: Math.random() * 1.5,
            opacity: Math.random() * 0.5,
            blink: 0.005 + Math.random() * 0.01
        }));

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            if (analyser && isPlaying) {
                analyser.getByteFrequencyData(dataArray);
            } else {
                dataArray.fill(0);
            }

            const bass = (dataArray[2] || 0) / 255;
            const mid = (dataArray[Math.floor(bufferLength * 0.1)] || 0) / 255;
            const high = (dataArray[Math.floor(bufferLength * 0.5)] || 0) / 255;

            // Transition logic
            if (interpolationRef.current.targetMood !== currentMood) {
                interpolationRef.current.targetMood = currentMood;
            }

            const config = ATMOSPHERES[currentMood] || ATMOSPHERES['Neutral'];

            // Deep background
            ctx.fillStyle = '#010103';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Stars
            ctx.save();
            stars.forEach(star => {
                star.opacity += star.blink;
                if (star.opacity > 0.8 || star.opacity < 0.1) star.blink *= -1;

                // Canvas coordinates might change on resize, keep them relative if needed
                const sx = (star.x % canvas.width);
                const sy = (star.y % canvas.height);

                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * config.starsOpacity})`;
                ctx.beginPath();
                ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();

            // Draw Aura Blobs
            ctx.save();
            ctx.filter = `blur(${config.blurAmount}px)`;

            config.blobs.forEach((blob, i) => {
                blob.phase += blob.speed * (isPlaying ? 1.0 : 0.2);

                const currentX = (blob.x + Math.sin(blob.phase) * 0.15) * canvas.width;
                const currentY = (blob.y + Math.cos(blob.phase * 0.8) * 0.15) * canvas.height;

                const reactivity = i === 0 ? bass : i === 1 ? mid : high;
                const dynamicSize = (blob.size + reactivity * 0.25) * Math.min(canvas.width, canvas.height);

                const rgb = blob.color;

                const grad = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, dynamicSize);
                grad.addColorStop(0, `rgba(${rgb}, ${config.bgAlpha + reactivity * 0.1})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.fillStyle = grad;
                ctx.globalCompositeOperation = 'screen';
                ctx.beginPath();
                ctx.arc(currentX, currentY, dynamicSize, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();

            // Quality film grain
            ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
            if (Math.random() > 0.7) ctx.fillRect(0, 0, canvas.width, canvas.height);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [analyser, isPlaying, currentMood]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-[0] transform translate-z-0"
            style={{ opacity: 0.95 }}
        />
    );
};
