import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/player';

const VIDEO_ATMOSPHERES: Record<string, string> = {
    'Chill': 'https://pixel-vids.pixabay.com/videos/download/video-31377.mp4?attachment', // Nubes lentas
    'Dynamic': 'https://pixel-vids.pixabay.com/videos/download/video-142353.mp4?attachment', // Túnel abstracto
    'Dark': 'https://pixel-vids.pixabay.com/videos/download/video-47402.mp4?attachment', // Humo oscuro
    'Happy': 'https://pixel-vids.pixabay.com/videos/download/video-31388.mp4?attachment', // Partículas doradas
    'Neutral': 'https://pixel-vids.pixabay.com/videos/download/video-31377.mp4?attachment'
};

export const VideoBackground: React.FC = () => {
    const { currentMood, isPlaying } = usePlayerStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [intensity, setIntensity] = useState(1);

    useEffect(() => {
        if (!isPlaying) return;

        let frameId: number;
        const updateIntensity = async () => {
            const { getAudioProcessor } = await import('../../utils/audioProcessor');
            const ap = getAudioProcessor();
            if (ap && ap.analyserNode) {
                const dataArray = new Uint8Array(ap.analyserNode.frequencyBinCount);
                ap.analyserNode.getByteFrequencyData(dataArray);

                let avg = 0;
                for (let i = 0; i < 32; i++) avg += dataArray[i];
                avg /= 32;

                const newIntensity = 1 + (avg / 255) * 0.5;
                setIntensity(newIntensity);

                if (videoRef.current) {
                    videoRef.current.playbackRate = 0.8 + (avg / 255) * 0.7;
                }
            }
            frameId = requestAnimationFrame(updateIntensity);
        };

        updateIntensity();
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying]);

    const videoUrl = VIDEO_ATMOSPHERES[currentMood] || VIDEO_ATMOSPHERES['Neutral'];

    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-black">
            <AnimatePresence mode="wait">
                <motion.video
                    key={videoUrl}
                    ref={videoRef}
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: 0.4,
                        scale: intensity
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2 }}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover mix-blend-screen grayscale-[50%] brightness-[50%]"
                >
                    <source src={videoUrl} type="video/mp4" />
                </motion.video>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black pointer-events-none" />
        </div>
    );
};
