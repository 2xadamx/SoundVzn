import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rectangular' }) => {
    return (
        <motion.div 
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className={`bg-white/5 relative overflow-hidden ${variant === 'circular' ? 'rounded-full' : 'rounded-xl'} ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        </motion.div>
    );
};
