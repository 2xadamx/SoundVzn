import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, Send, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface BugReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose, userEmail }) => {
    const [description, setDescription] = useState('');
    const [includeLogs, setIncludeLogs] = useState(true);
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async () => {
        if (!description.trim()) return;

        setStatus('sending');
        try {
            const result = await (window as any).electron.submitBug({
                description,
                includeLogs,
                email: userEmail
            });

            if (result.success) {
                setStatus('success');
                setTimeout(() => {
                    onClose();
                    resetForm();
                }, 2000);
            } else {
                throw new Error(result.error || 'Error desconocido al enviar el reporte');
            }
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message);
        }
    };

    const resetForm = () => {
        setDescription('');
        setIncludeLogs(true);
        setStatus('idle');
        setErrorMsg('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-[#0e0e13] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                    <Bug size={20} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Reportar un Error</h3>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Feedback Beta</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {status === 'success' ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-12 flex flex-col items-center text-center space-y-4"
                                >
                                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <CheckCircle2 size={32} className="text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white">¡Gracias por el reporte!</p>
                                        <p className="text-sm text-white/50 mt-1">Nuestros ingenieros lo revisarán pronto.</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-white/60 ml-1">Descripción del problema</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="¿Qué estabas haciendo? ¿Qué error apareció? Cuanto más detalle, mejor..."
                                            className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                                        />
                                    </div>

                                    <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                <FileText size={14} className="text-white/40" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-white/80">Adjuntar logs de diagnóstico</p>
                                                <p className="text-[10px] text-white/30">Incluye errores técnicos del sistema</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIncludeLogs(!includeLogs)}
                                            className={clsx(
                                                "w-10 h-5 rounded-full transition-all relative border",
                                                includeLogs ? "bg-primary border-primary" : "bg-white/10 border-white/10"
                                            )}
                                        >
                                            <motion.div
                                                animate={{ x: includeLogs ? 20 : 2 }}
                                                className="absolute top-0.5 h-3.5 w-3.5 bg-white rounded-full shadow-lg"
                                            />
                                        </button>
                                    </div>

                                    {status === 'error' && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                                            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-red-400 leading-relaxed font-medium">{errorMsg}</p>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <button
                                            disabled={!description.trim() || status === 'sending'}
                                            onClick={handleSubmit}
                                            className={clsx(
                                                "w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                                                description.trim() && status !== 'sending'
                                                    ? "bg-primary text-black hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
                                                    : "bg-white/5 text-white/30 cursor-not-allowed border border-white/5"
                                            )}
                                        >
                                            {status === 'sending' ? (
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                    className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                                                />
                                            ) : (
                                                <>
                                                    <Send size={16} />
                                                    Enviar Reporte
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
