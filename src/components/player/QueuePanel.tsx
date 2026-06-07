import React from 'react';
import { usePlayerStore } from '../../store/player';
import { X, Play, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export const QueuePanel: React.FC = () => {
    const { 
        queue, 
        currentIndex, 
        setIsQueueOpen, 
        playTrackFromQueue,
        setQueue
    } = usePlayerStore();

    const getArtwork = (track: any): string => {
        if (typeof track.artwork === 'string' && track.artwork) return track.artwork;
        return (track as any).cover_url || (track as any).thumbnail || '';
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0c]/95 backdrop-blur-3xl border-l border-white/5">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                <div>
                    <h3 className="text-sm font-black text-white tracking-tight">Cola de reproducción</h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-0.5">
                        {queue.length} {queue.length === 1 ? 'canción' : 'canciones'}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    {queue.length > 0 && (
                        <button
                            onClick={() => setQueue([])}
                            className="p-2 text-white/20 hover:text-red-400 rounded-full hover:bg-red-500/10 transition-colors"
                            title="Vaciar cola"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    <button 
                        onClick={() => setIsQueueOpen(false)}
                        className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
            
            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                {queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 text-center px-6 pb-20">
                        <Play size={40} className="mb-4 opacity-20" />
                        <p className="text-sm font-bold">La cola está vacía</p>
                        <p className="text-[10px] mt-2 text-white/15">Reproduce alguna canción para añadirla aquí.</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {queue.map((track, i) => {
                            const isCurrent = i === currentIndex;
                            const artwork = getArtwork(track);
                            return (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.15 }}
                                    key={`${track.id}-${i}`}
                                    onClick={() => !isCurrent && playTrackFromQueue(i)}
                                    className={clsx(
                                        "group flex items-center gap-3 px-4 py-2.5 transition-all cursor-pointer border-l-2",
                                        isCurrent
                                            ? "bg-white/[0.04] border-l-white/60"
                                            : "border-l-transparent hover:bg-white/[0.03] hover:border-l-white/10"
                                    )}
                                >
                                    {/* Index / Playing indicator */}
                                    <div className="w-5 shrink-0 flex items-center justify-center">
                                        {isCurrent ? (
                                            <div className="flex items-end gap-[2px] h-4">
                                                {[3, 4, 2].map((h, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        animate={{ height: [h, h + 6, h] }}
                                                        transition={{ duration: 0.6, repeat: Infinity, delay: idx * 0.15 }}
                                                        className="w-[2px] bg-white rounded-full"
                                                        style={{ height: h }}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-mono text-white/20 group-hover:text-white/40">{i + 1}</span>
                                        )}
                                    </div>

                                    {/* Artwork */}
                                    <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/5">
                                        {artwork ? (
                                            <img src={artwork} alt={track.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/10">
                                                <Play size={12} />
                                            </div>
                                        )}
                                        {!isCurrent && (
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Play fill="white" size={12} className="text-white ml-0.5" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className={clsx(
                                            "text-[12px] font-bold truncate leading-tight",
                                            isCurrent ? "text-white" : "text-white/70 group-hover:text-white"
                                        )}>
                                            {track.title}
                                        </p>
                                        <p className="text-[10px] text-white/30 truncate mt-0.5">{track.artist}</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};
