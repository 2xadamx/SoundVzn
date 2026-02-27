/**
 * Starfield — Canvas 2D puro, fondo de estrellas estático + cometas Rolls-Royce.
 * Las estrellas NO cambian de tamaño al reproducir (comportamiento uniforme).
 * Animación de twinkle muy suave (~3s por ciclo).
 */
import { useEffect, useRef } from 'react';

interface Star {
    x: number;
    y: number;
    r: number;           // radio base — nunca cambia
    baseAlpha: number;
    twinkleAmp: number;  // amplitud máxima del twinkle (muy pequeña)
    twinkleFreq: number; // Hz del twinkle (~0.15-0.3 Hz = ciclo cada 3-7s)
    twinklePhase: number;
    hue: number;
}

interface Comet {
    x: number; y: number;
    vx: number; vy: number;
    tailLen: number;
    life: number; maxLife: number;
    alpha: number;
}

export const Starfield = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const startTime = useRef<number>(performance.now());

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let W = window.innerWidth;
        let H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;

        // ── Crear estrellas ───────────────────────────────────────────
        const COUNT = 240;
        const stars: Star[] = Array.from({ length: COUNT }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 1.4 + 0.2,           // radio fijo, muy pequeño
            baseAlpha: Math.random() * 0.5 + 0.15,  // opacidad base
            twinkleAmp: Math.random() * 0.25 + 0.05, // ±5..30% — twinkle suave
            twinkleFreq: Math.random() * 0.18 + 0.08, // 0.08–0.26 Hz → períodos 4–12 s
            twinklePhase: Math.random() * Math.PI * 2,
            hue: 200 + Math.random() * 40,           // azul-blanco frío
        }));

        // ── Cometas ───────────────────────────────────────────────────
        const comets: Comet[] = [];
        let lastComet = -5000;
        const COMET_INTERVAL = 5000; // ms

        const spawnComet = () => {
            const angle = (Math.random() * 30 + 25) * (Math.PI / 180);
            const speed = Math.random() * 5 + 3.5;
            comets.push({
                x: Math.random() * W * 0.55,
                y: Math.random() * H * 0.45,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                tailLen: Math.random() * 90 + 60,
                life: 0,
                maxLife: Math.random() * 55 + 40,
                alpha: Math.random() * 0.55 + 0.3,
            });
        };

        const draw = (ts: number) => {
            rafRef.current = requestAnimationFrame(draw);
            const t = (ts - startTime.current) / 1000; // segundos transcurridos

            // Fondo oscuro
            ctx.clearRect(0, 0, W, H);
            const bg = ctx.createRadialGradient(W * 0.35, H * 0.2, 0, W * 0.5, H * 0.5, Math.max(W, H));
            bg.addColorStop(0, '#09071c');
            bg.addColorStop(0.6, '#05040f');
            bg.addColorStop(1, '#020208');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Dibujar estrellas — tamaño CONSTANTE, solo opacidad varía suavemente
            for (const s of stars) {
                const twinkle = Math.sin(t * s.twinkleFreq * Math.PI * 2 + s.twinklePhase);
                const alpha = Math.max(0.05, s.baseAlpha + twinkle * s.twinkleAmp);

                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${s.hue}, 65%, 96%, ${alpha})`;
                ctx.fill();

                // Halo sutil en estrellas medianas sin spiking de tamaño
                if (s.r > 1.1 && alpha > 0.5) {
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${s.hue}, 80%, 96%, ${alpha * 0.07})`;
                    ctx.fill();
                }
            }

            // Cometas
            if (ts - lastComet > COMET_INTERVAL) { spawnComet(); lastComet = ts; }

            for (let i = comets.length - 1; i >= 0; i--) {
                const c = comets[i];
                const prog = c.life / c.maxLife;
                const fade = Math.sin(prog * Math.PI); // fade in/out suave
                const a = c.alpha * fade;

                const spd = Math.sqrt(c.vx ** 2 + c.vy ** 2);
                const tx = c.x - (c.vx / spd) * c.tailLen;
                const ty = c.y - (c.vy / spd) * c.tailLen;

                const g = ctx.createLinearGradient(tx, ty, c.x, c.y);
                g.addColorStop(0, `rgba(255,255,255,0)`);
                g.addColorStop(0.65, `rgba(200,220,255,${a * 0.25})`);
                g.addColorStop(1, `rgba(255,255,255,${a})`);

                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(c.x, c.y);
                ctx.strokeStyle = g;
                ctx.lineWidth = 1.2;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Punta del cometa
                ctx.beginPath();
                ctx.arc(c.x, c.y, 1.8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${a})`;
                ctx.fill();

                c.x += c.vx;
                c.y += c.vy;
                c.life++;
                if (c.life >= c.maxLife || c.x > W + 150 || c.y > H + 150) {
                    comets.splice(i, 1);
                }
            }
        };

        rafRef.current = requestAnimationFrame(draw);

        const onResize = () => {
            W = window.innerWidth; H = window.innerHeight;
            canvas.width = W; canvas.height = H;
        };
        window.addEventListener('resize', onResize);
        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', width: '100vw', height: '100vh' }}
            aria-hidden
        />
    );
};
