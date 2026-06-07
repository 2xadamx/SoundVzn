import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

interface HolographicArtProps {
    src: string;
    alt: string;
    className?: string;
    isPlaying?: boolean;
}

export const HolographicArt: React.FC<HolographicArtProps> = ({ src, alt, className, isPlaying }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Motion values for mouse position
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth physics configuration
    const springConfig = { damping: 25, stiffness: 150 };
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), springConfig);
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), springConfig);

    // Highlight/Shine transforms
    const shineX = useTransform(x, [-0.5, 0.5], ['0%', '100%']);
    const shineY = useTransform(y, [-0.5, 0.5], ['0%', '100%']);
    const shineOpacity = useTransform(x, [-0.5, 0.5], [0.3, 0.1]);

    // Rainbow/Prismatic effect
    const rainbowPos = useTransform(x, [-0.5, 0.5], ['0%', '200%']);
    const rainbowOpacity = useTransform(x, [-0.5, 0.5], [0.15, 0.05]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        // Normalize coordinates to -0.5 to 0.5
        const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
        const mouseY = (e.clientY - rect.top) / rect.height - 0.5;

        x.set(mouseX);
        y.set(mouseY);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`relative perspective-1000 ${className}`}
            style={{ perspective: '1200px' }}
        >
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: 'preserve-3d',
                }}
                animate={isPlaying ? {
                    scale: [1, 1.02, 1],
                } : { scale: 1 }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-full h-full rounded-[60px] overflow-hidden border border-white/20 shadow-2xl"
            >
                {/* Main Artwork */}
                <motion.img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                    style={{
                        transform: 'translateZ(0px)',
                    }}
                />

                {/* Holographic Gloss/Shine Layer */}
                <motion.div
                    style={{
                        background: `radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,${shineOpacity.get()}) 0%, transparent 80%)`,
                        transform: 'translateZ(20px)',
                    }}
                    className="absolute inset-0 pointer-events-none mix-blend-overlay"
                />

                {/* PRISMATIC RAINBOW LAYER */}
                <motion.div
                    style={{
                        backgroundImage: `linear-gradient(110deg, 
                            transparent 0%, 
                            rgba(255,0,0,${rainbowOpacity.get()}) 20%, 
                            rgba(255,255,0,${rainbowOpacity.get()}) 30%, 
                            rgba(0,255,0,${rainbowOpacity.get()}) 40%, 
                            rgba(0,255,255,${rainbowOpacity.get()}) 50%, 
                            rgba(0,0,255,${rainbowOpacity.get()}) 60%, 
                            rgba(255,0,255,${rainbowOpacity.get()}) 70%, 
                            transparent 100%)`,
                        backgroundSize: '200% 100%',
                        backgroundPosition: `${rainbowPos} 0%`,
                        transform: 'translateZ(30px)',
                    }}
                    className="absolute inset-0 pointer-events-none mix-blend-color-dodge opacity-60"
                />

                {/* Depth Highlight (Top-Left Edge) */}
                <motion.div
                    style={{
                        opacity: useTransform(x, [-0.5, 0.5], [0.1, 0.4]),
                        transform: 'translateZ(10px)',
                    }}
                    className="absolute inset-0 border-l border-t border-white/10 rounded-[60px] pointer-events-none"
                />
            </motion.div>

            {/* Float Badge Parallax */}
            <motion.div
                style={{
                    x: useTransform(x, [-0.5, 0.5], [-10, 10]),
                    y: useTransform(y, [-0.5, 0.5], [-10, 10]),
                    transform: 'translateZ(50px)',
                }}
                className="absolute -top-4 -right-4 px-6 py-2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-20"
            >
                <span className="text-[10px] font-bold text-white/40 tracking-[0.3em] uppercase italic">Pure Fidelity</span>
            </motion.div>
        </div>
    );
};
