import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/player';

export const HologramVisualizer: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyser = usePlayerStore((state) => state.analyser);
    const isPlaying = usePlayerStore((state) => state.isPlaying);
    const animationRef = useRef<number>();

    useEffect(() => {
        if (!canvasRef.current || !analyser) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Stars for the galactic effect
        const stars = Array.from({ length: 350 }, () => ({

            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5,
            opacity: Math.random(),
            blinkSpeed: 0.01 + Math.random() * 0.02
        }));

        // Comets
        const comets: any[] = [];
        const createComet = () => {
            const startX = Math.random() * canvas.width;
            const startY = -50;
            const angle = (Math.PI / 4) + (Math.random() * Math.PI / 8);
            comets.push({
                x: startX,
                y: startY,
                speed: 2 + Math.random() * 4,
                angle: angle,
                length: 50 + Math.random() * 100,
                opacity: 0.8
            });
        };

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            if (isPlaying) {
                analyser.getByteFrequencyData(dataArray);
            } else {
                dataArray.fill(0);
            }

            // Deep OLED black background - Deepened to #010103 for maximum contrast
            ctx.fillStyle = 'rgba(1, 1, 3, 0.95)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);


            const primaryRGB = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-rgb') || '255, 255, 255';

            // Frequency bands for reactivity - CRITICAL FIX
            const bassValue = dataArray[Math.floor(bufferLength * 0.02)] || 0;
            const bass = bassValue / 255;

            // Draw Stars
            stars.forEach((star, i) => {
                star.opacity += star.blinkSpeed;
                if (star.opacity > 1 || star.opacity < 0.1) star.blinkSpeed *= -1;

                // Removed Bass reactivity from star size as requested
                const starSize = star.size;

                ctx.fillStyle = `rgba(${primaryRGB}, ${star.opacity * (0.6 + (i % 5 === 0 ? bass * 0.4 : 0))})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, starSize, 0, Math.PI * 2);
                ctx.fill();
            });

            // Handle Comets
            if (Math.random() < 0.005) createComet();

            ctx.save();
            for (let i = comets.length - 1; i >= 0; i--) {
                const comet = comets[i];
                comet.x += Math.cos(comet.angle) * comet.speed;
                comet.y += Math.sin(comet.angle) * comet.speed;
                comet.opacity -= 0.005;

                if (comet.opacity <= 0 || comet.x > canvas.width || comet.y > canvas.height) {
                    comets.splice(i, 1);
                    continue;
                }

                const grad = ctx.createLinearGradient(
                    comet.x, comet.y,
                    comet.x - Math.cos(comet.angle) * comet.length,
                    comet.y - Math.sin(comet.angle) * comet.length
                );
                grad.addColorStop(0, `rgba(${primaryRGB}, ${comet.opacity})`);
                grad.addColorStop(1, `rgba(${primaryRGB}, 0)`);

                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(comet.x, comet.y);
                ctx.lineTo(comet.x - Math.cos(comet.angle) * comet.length, comet.y - Math.sin(comet.angle) * comet.length);
                ctx.stroke();
            }
            ctx.restore();

            // Ambient Glow (Aura)
            ctx.save();
            ctx.filter = 'blur(150px)';
            ctx.globalAlpha = 0.15 + (bass * 0.15);
            const gradAura = ctx.createRadialGradient(
                canvas.width / 2, canvas.height, 0,
                canvas.width / 2, canvas.height, canvas.height
            );
            gradAura.addColorStop(0, `rgb(${primaryRGB})`);
            gradAura.addColorStop(1, 'transparent');
            ctx.fillStyle = gradAura;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [analyser, isPlaying]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-[0]"

        />
    );
};
