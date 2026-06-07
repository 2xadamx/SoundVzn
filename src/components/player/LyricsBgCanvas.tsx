import React, { useEffect, useRef } from 'react';
import { extractColors } from '../../utils/colorExtractor';

interface LyricsBgCanvasProps {
    artwork: string;
}

class Blob {
    x: number;
    y: number;
    radius: number;
    color: string;
    vx: number;
    vy: number;
    targetColor: string;

    constructor(width: number, height: number, color: string) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * (width + height) / 1.5 + 400;
        this.color = color;
        this.targetColor = color;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
    }

    update(width: number, height: number) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
        
        // Smoothly interpolate color
        this.color = this.lerpColor(this.color, this.targetColor, 0.05);
    }

    setTargetColor(color: string) {
        this.targetColor = color;
    }

    private lerpColor(c1: string, c2: string, t: number): string {
        const r1 = parseInt(c1.substring(1, 3), 16);
        const g1 = parseInt(c1.substring(3, 5), 16);
        const b1 = parseInt(c1.substring(5, 7), 16);
        const r2 = parseInt(c2.substring(1, 3), 16);
        const g2 = parseInt(c2.substring(3, 5), 16);
        const b2 = parseInt(c2.substring(5, 7), 16);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    draw(ctx: CanvasRenderingContext2D) {
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

export const LyricsBgCanvas: React.FC<LyricsBgCanvasProps> = ({ artwork }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const blobsRef = useRef<Blob[]>([]);

    useEffect(() => {
        const updateColors = async () => {
            if (!artwork) return;
            try {
                const colors = await extractColors(artwork);
                const darkened = colors.slice(0, 5).map(c => darkenColor(c, 0.8));
                
                if (blobsRef.current.length === 0) {
                    const canvas = canvasRef.current;
                    if (canvas) {
                        blobsRef.current = darkened.map(c => new Blob(canvas.width, canvas.height, c));
                    }
                } else {
                    blobsRef.current.forEach((blob, i) => {
                        if (darkened[i]) blob.setTargetColor(darkened[i]);
                    });
                }
            } catch (e) {
                console.error('Failed to extract colors for lyrics bg', e);
            }
        };
        updateColors();
    }, [artwork]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            const { width, height } = canvas;
            ctx.fillStyle = '#050508'; // Base background
            ctx.fillRect(0, 0, width, height);

            ctx.globalCompositeOperation = 'screen';
            blobsRef.current.forEach(blob => {
                blob.update(width, height);
                blob.draw(ctx);
            });
            ctx.globalCompositeOperation = 'source-over';

            animationFrameId = requestAnimationFrame(render);
        };

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Re-sync blobs to new dimensions if necessary
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full -z-10 bg-[#050508]"
            style={{ filter: 'blur(100px) saturate(2) brightness(0.8)' }}
        />
    );
};

function darkenColor(hex: string, _factor: number): string {
    return hex; // Keep original color for maximum vibrancy in lyrics canvas
}
