import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/player';
import { Info, CheckCircle, AlertCircle, Volume2, Music, Wind } from 'lucide-react';
import clsx from 'clsx';

export const ToastSystem: React.FC = () => {
    const toasts = usePlayerStore((state) => state.toasts);

    return (
        <div className="fixed top-4 sm:top-8 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col items-center gap-2 w-[calc(100vw-32px)] sm:w-auto max-w-sm sm:max-w-lg">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: -40, scale: 0.85 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: {
                                type: "spring",
                                stiffness: 400,
                                damping: 30,
                                mass: 0.8,
                            }
                        }}
                        exit={{
                            opacity: 0,
                            scale: 0.85,
                            y: -20,
                            transition: { duration: 0.25, ease: "easeIn" }
                        }}
                        className={clsx(
                            "pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-[24px] backdrop-blur-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full sm:min-w-[240px] sm:max-w-lg transition-all duration-500",
                            toast.type === 'volume' ? "bg-black/80 border-white/10" :
                                toast.type === 'error' ? "bg-red-500/20 border-red-500/30 text-red-200" :
                                    toast.type === 'track' ? "bg-primary/20 border-primary/30 text-white" :
                                        "bg-white/10 border-white/10 text-white"
                        )}
                    >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                            {toast.type === 'info' && <Info size={20} className="text-blue-400" />}
                            {toast.type === 'success' && <CheckCircle size={20} className="text-emerald-400" />}
                            {toast.type === 'error' && <AlertCircle size={20} className="text-red-400" />}
                            {toast.type === 'volume' && <Volume2 size={20} className="text-primary-400" />}
                            {toast.type === 'track' && <Music size={20} className="text-secondary-400" />}
                            {toast.message.includes('Zen') && <Wind size={20} className="text-primary-300" />}
                        </div>
                        <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 leading-tight">
                                {toast.type === 'track' ? 'Ahora suena' :
                                    toast.type === 'volume' ? 'Volumen' :
                                        toast.type === 'error' ? 'Oops!' : 'Notificación'}
                            </span>
                            <span className="text-sm font-bold tracking-tight text-white truncate max-w-[300px]">
                                {toast.message}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
