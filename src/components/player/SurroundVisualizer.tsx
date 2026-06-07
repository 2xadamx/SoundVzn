import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const SurroundVisualizer: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrame: number;
        const particles: any[] = [];
        const particleCount = 100;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random() * 1000,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 0.5
            });
        }

        const render = async () => {
            const { getAudioProcessor } = await import('../../utils/audioProcessor');
            const ap = getAudioProcessor();
            let bassEnergy = 0;

            if (ap?.analyserNode) {
                const dataArray = new Uint8Array(ap.analyserNode.frequencyBinCount);
                ap.analyserNode.getByteFrequencyData(dataArray);
                for (let i = 0; i < 10; i++) bassEnergy += dataArray[i];
                bassEnergy /= 10;
            }

            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            particles.forEach(p => {
                const scale = 1000 / (1000 + p.z);
                const screenX = centerX + (p.x - centerX) * scale;
                const screenY = centerY + (p.y - centerY) * scale;
                const finalSize = p.size * scale * (1 + bassEnergy / 255);

                const opacity = Math.max(0, 1 - p.z / 1000);
                const blur = p.z / 200;

                ctx.filter = `blur(${blur}px)`;
                ctx.fillStyle = `rgba(14, 165, 233, ${opacity})`;

                ctx.beginPath();
                ctx.arc(screenX, screenY, finalSize, 0, Math.PI * 2);
                ctx.fill();

                p.z -= p.speed * (1 + bassEnergy / 100);
                if (p.z < 1) {
                    p.z = 1000;
                    p.x = Math.random() * canvas.width;
                    p.y = Math.random() * canvas.height;
                }
            });

            ctx.filter = 'none';
            animationFrame = requestAnimationFrame(render);
        };

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        render();

        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-0 pointer-events-none"
        >
            <canvas ref={canvasRef} className="w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-60" />
        </motion.div>
    );
};
