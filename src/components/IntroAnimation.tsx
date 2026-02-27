import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface IntroAnimationProps {
    onComplete: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 3500); // 3.5 seconds duration
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-[9999]">
            {/* Background Glow */}
            <motion.div
                animate={{
                    scale: [0.8, 1.2, 1],
                    opacity: [0, 0.5, 0]
                }}
                transition={{ duration: 3, ease: "easeInOut" }}
                className="absolute w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]"
            />

            {/* Logo / Text */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 flex flex-col items-center"
            >
                <div className="w-[500px] h-[250px] mb-8 relative flex items-center justify-center overflow-hidden">
                    {/* Background Glow - Intensified */}
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-125 opacity-40" />

                    <motion.div
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="relative w-full h-full flex items-center justify-center"
                    >
                        <img
                            src="/banner-splash.jpeg"
                            alt="SoundVzn Banner"
                            className="w-full h-full object-contain relative z-10"
                            style={{
                                WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 85%)',
                                maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 85%)'
                            }}
                        />

                        {/* Vignette Overlay for extra blending safety */}
                        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a] opacity-60" />
                        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a] opacity-60" />
                    </motion.div>
                </div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">
                    SoundVizion
                </h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="text-text-tertiary mt-2 text-sm font-mono tracking-widest uppercase"
                >
                    Hi-Res Audio Environment
                </motion.p>
            </motion.div>

            {/* Progress Bar Line */}
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: 200 }}
                transition={{ delay: 0.5, duration: 2.5, ease: "easeInOut" }}
                className="absolute bottom-20 h-[2px] bg-gradient-to-r from-primary to-accent-blue rounded-full"
            />
        </div>
    );
};
