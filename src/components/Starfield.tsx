import React, { useEffect, useRef } from 'react';

export const Starfield: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationId: number;
        let isMounted = true;

        interface Star {
            x: number; y: number; r: number;
            opacity: number; speed: number;
            color: string; twinkleOffset: number;
        }

        interface Comet {
            x: number; y: number;
            length: number; speed: number;
            angle: number; opacity: number;
            active: boolean; life: number;
        }

        const stars: Star[] = [];
        const comets: Comet[] = [];
        const COLORS = ['#ffffff', '#e0f0ff', '#ffe8d0', '#cce0ff'];
        let t = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const init = () => {
            stars.length = 0;
            const count = Math.min(200, Math.floor((canvas.width * canvas.height) / 8000));
            for (let i = 0; i < count; i++) {
                const z = Math.random() * 3 + 1;
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    r: (Math.random() * 0.8 + 0.2) / (z * 0.5),
                    opacity: Math.random() * 0.4 + 0.1,
                    speed: (0.01 + Math.random() * 0.03) / z,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    twinkleOffset: Math.random() * Math.PI * 2
                });
            }
        };

        const spawnComet = () => {
            const startX = Math.random() * canvas.width * 1.5;
            const startY = -100;
            comets.push({
                x: startX,
                y: startY,
                length: 30 + Math.random() * 80,
                speed: 1.5 + Math.random() * 2.5,
                angle: Math.PI / 4 + (Math.random() - 0.5) * 0.1,
                opacity: 0,
                active: true,
                life: 0
            });
        };

        const draw = () => {
            if (!isMounted) return;
            t += 0.003;

            // Deep space black
            ctx.fillStyle = '#020205';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Batched Star Drawing
            ctx.save();
            stars.forEach(s => {
                s.x -= s.speed * 1.5;
                if (s.x < 0) s.x = canvas.width;

                const twinkle = Math.sin(t * 1.5 + s.twinkleOffset) * 0.4 + 0.6;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = s.color;
                ctx.globalAlpha = s.opacity * twinkle;
                ctx.fill();
            });
            ctx.restore();

            // Comets / Shooting Stars System
            if (Math.random() < 0.02 && comets.length < 5) {
                spawnComet();
            }

            for (let i = comets.length - 1; i >= 0; i--) {
                const c = comets[i];
                if (!c.active) continue;

                c.life += 0.02;
                c.x -= Math.cos(c.angle) * c.speed;
                c.y += Math.sin(c.angle) * c.speed;

                // Fade in then out
                if (c.life < 1) c.opacity = c.life;
                else if (c.life > 2) c.opacity = Math.max(0, 3 - c.life);
                
                if (c.y > canvas.height + c.length || c.opacity <= 0) {
                    comets.splice(i, 1);
                    continue;
                }

                // Draw Comet Tail
                const tailEndX = c.x + Math.cos(c.angle) * c.length;
                const tailEndY = c.y - Math.sin(c.angle) * c.length;

                const grad = ctx.createLinearGradient(c.x, c.y, tailEndX, tailEndY);
                grad.addColorStop(0, `rgba(255, 255, 255, ${c.opacity * 0.9})`);
                grad.addColorStop(0.1, `rgba(14, 165, 233, ${c.opacity * 0.4})`); // Sky blue tail
                grad.addColorStop(1, 'rgba(14, 165, 233, 0)');

                ctx.save();
                // Diffuse glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(14, 165, 233, 0.3)';
                
                ctx.beginPath();
                ctx.moveTo(c.x, c.y);
                ctx.lineTo(tailEndX, tailEndY);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 0.8;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Small comet head
                ctx.beginPath();
                ctx.arc(c.x, c.y, 1, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${c.opacity})`;
                ctx.fill();
                ctx.restore();
            }

            // Subtle nebula wash
            const grad = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.5, 0, canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.8);
            grad.addColorStop(0, 'rgba(10, 20, 40, 0.05)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            animationId = requestAnimationFrame(draw);
        };

        const onResize = () => { resize(); init(); };
        resize(); init(); draw();
        window.addEventListener('resize', onResize);

        return () => {
            isMounted = false;
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[-1] pointer-events-none"
            style={{ background: '#020205' }}
        />
    );
};
