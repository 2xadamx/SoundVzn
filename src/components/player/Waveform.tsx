import React, { useRef, useEffect, useState, useMemo } from 'react';
import clsx from 'clsx';

interface WaveformProps {
    trackId: string;
    progress: number; // 0 to 100
    onSeek?: (progress: number) => void;
    className?: string;
    barColor?: string;
    activeBarColor?: string;
    height?: number;
}

/**
 * Procedural Waveform Visualizer
 * Generates a deterministic "musical" waveform based on the track ID.
 */
export const Waveform: React.FC<WaveformProps> = ({
    trackId,
    progress,
    onSeek,
    className,
    barColor = 'rgba(255, 255, 255, 0.15)',
    activeBarColor = '#0ea5e9',
    height = 40
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [hoverX, setHoverX] = useState(0);

    // Generate deterministic peaks
    const peaks = useMemo(() => {
        const count = 120;
        const result: number[] = [];

        // Safety guard for missing trackId
        const safeTrackId = String(trackId || 'default-track');

        // Simple hash function for seeding
        let hash = 0;
        for (let i = 0; i < safeTrackId.length; i++) {
            hash = ((hash << 5) - hash) + safeTrackId.charCodeAt(i);
            hash |= 0;
        }

        const seededRandom = () => {
            hash = Math.sin(hash) * 10000;
            return hash - Math.floor(hash);
        };

        let lastVal = 0.5;
        for (let i = 0; i < count; i++) {
            // Create "blobs" of energy instead of pure noise
            const step = (seededRandom() - 0.5) * 0.4;
            let val = lastVal + step;

            // Influence by position to create a traditional song structure look (low start/end, high middle)
            const structureInertia = Math.sin((i / count) * Math.PI);
            val = (val * 0.6) + (structureInertia * 0.4);

            // Clamp
            val = Math.max(0.1, Math.min(1.0, val));
            result.push(val);
            lastVal = val;
        }
        return result;
    }, [trackId]);

    const draw = () => {
        if (!containerRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const container = containerRef.current;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, rect.width, height);

        const barWidth = rect.width / peaks.length;
        const gap = 2;
        const actualBarWidth = barWidth - gap;

        peaks.forEach((peak, i) => {
            const x = i * barWidth;
            const barHeight = peak * height;
            const y = (height - barHeight) / 2;

            const isPlayed = (i / peaks.length) * 100 <= progress;
            const isHovered = isHovering && x <= hoverX;

            // Bar drawing logic
            ctx.beginPath();
            if (isPlayed) {
                ctx.fillStyle = activeBarColor;
                // Add glow to active bars
                ctx.shadowBlur = 8;
                ctx.shadowColor = `${activeBarColor}44`;
            } else {
                ctx.fillStyle = isHovered ? `${activeBarColor}44` : barColor;
                ctx.shadowBlur = 0;
            }

            // Rounded bars
            const radius = actualBarWidth / 2;
            ctx.roundRect(x, y, Math.max(1, actualBarWidth), barHeight, radius);
            ctx.fill();
        });
    };

    useEffect(() => {
        let isMounted = true;
        const currentContainer = containerRef.current;

        const safeDraw = () => {
            if (isMounted) draw();
        };

        safeDraw();

        // Handle resizing
        const observer = new ResizeObserver(() => {
            if (isMounted) safeDraw();
        });

        if (currentContainer) {
            observer.observe(currentContainer);
        }

        return () => {
            isMounted = false;
            observer.disconnect();
            if (currentContainer) {
                observer.unobserve(currentContainer);
            }
        };
    }, [peaks, progress, isHovering, hoverX, height, activeBarColor, barColor]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setHoverX(e.clientX - rect.left);
        setIsHovering(true);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (!containerRef.current || !onSeek) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newProgress = (x / rect.width) * 100;
        onSeek(Math.min(100, Math.max(0, newProgress)));
    };

    return (
        <div
            ref={containerRef}
            className={clsx("relative cursor-pointer group select-none", className)}
            style={{ height }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setIsHovering(false)}
            onClick={handleClick}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ width: '100%', height: '100%' }}
            />

            {/* Playhead indicator - Using plain CSS for maximum stability during rapid unmounts */}
            <div
                className="absolute top-0 bottom-0 w-[2px] bg-white z-10 pointer-events-none transition-all duration-300 ease-out"
                style={{ left: `${progress}%` }}
            >
                <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
            </div>

            {/* Hover timestamp or line could be added here */}
        </div>
    );
};
