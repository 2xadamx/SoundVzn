import React from 'react';

export const SkeletonCard: React.FC = () => {
    return (
        <div className="w-48 flex-shrink-0 animate-pulse">
            <div className="w-48 h-48 rounded-[24px] bg-white/5 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            </div>
            <div className="mt-4 space-y-2">
                <div className="h-4 bg-white/10 rounded-full w-3/4" />
                <div className="h-3 bg-white/5 rounded-full w-1/2" />
            </div>
        </div>
    );
};

export const SpotlightSkeleton: React.FC = () => {
    return (
        <div className="w-full h-80 rounded-[48px] bg-white/5 animate-pulse relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5"
                style={{ transform: 'skewX(-20deg)', width: '200%', left: '-50%' }} />
            <div className="absolute bottom-12 left-12 space-y-4 w-1/2">
                <div className="h-4 bg-white/10 rounded-full w-1/4" />
                <div className="h-10 bg-white/10 rounded-full w-3/4" />
                <div className="h-6 bg-white/5 rounded-full w-1/2" />
            </div>
        </div>
    );
};

export const SkeletonRow: React.FC = () => {
    return (
        <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded-full w-1/3" />
                <div className="h-3 bg-white/5 rounded-full w-1/4" />
            </div>
            <div className="w-20 h-4 bg-white/5 rounded-full" />
        </div>
    );
};
