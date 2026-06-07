import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Info, BookOpen, Quote } from 'lucide-react';
import { usePlayerStore } from '../../store/player';
import { StorylineEngine, NarrativeStep } from '../../utils/StorylineEngine';

export const Storyline: React.FC = () => {
    const { currentTrack, currentTime } = usePlayerStore();
    const [storyline, setStoryline] = useState<NarrativeStep[]>([]);
    const [activeStep, setActiveStep] = useState<NarrativeStep | null>(null);

    useEffect(() => {
        if (!currentTrack) return;

        StorylineEngine.generateStoryline(currentTrack).then(setStoryline);
    }, [currentTrack?.id]);

    useEffect(() => {
        const step = storyline.find(
            s => currentTime >= s.startTime && currentTime < s.startTime + s.duration
        );
        setActiveStep(step || null);
    }, [currentTime, storyline]);

    if (!activeStep) return null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={activeStep.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="relative p-6 rounded-[24px] bg-gradient-to-br from-primary-500/10 to-transparent border border-white/5 backdrop-blur-xl max-w-lg mx-auto overflow-hidden group shadow-2xl shadow-primary-500/5"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                    {activeStep.type === 'bio' && <BookOpen size={48} />}
                    {activeStep.type === 'trivia' && <Sparkles size={48} />}
                    {activeStep.type === 'stat' && <Info size={48} />}
                </div>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400">
                        {activeStep.type === 'bio' && <Quote size={14} />}
                        {activeStep.type === 'trivia' && <Sparkles size={14} />}
                        {activeStep.type === 'stat' && <Info size={14} />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400/80 italic">
                        {activeStep.type === 'bio' ? 'Historia del Artista' : activeStep.type === 'trivia' ? 'Sabías que...' : 'Estadísticas Globales'}
                    </span>
                </div>

                <p className="text-white/90 text-sm leading-relaxed font-semibold tracking-tight">
                    {activeStep.text}
                </p>

                <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: activeStep.duration, ease: 'linear' }}
                        className="h-full bg-primary-500"
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
