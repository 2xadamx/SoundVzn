import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Zap } from 'lucide-react';
import { BACKEND_URL } from '@utils/apiConfig';

/**
 * Enterprise Connectivity Guard
 * Blocks the UI with a premium overlay if the SoundVzn core is unreachable.
 */
export const ConnectivityGuard: React.FC = () => {
    const [isOffline, setIsOffline] = useState(false);
    const [retrying, setRetrying] = useState(false);

    const checkHealth = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/health`, { cache: 'no-store' });
            setIsOffline(!res.ok);
        } catch (err) {
            setIsOffline(true);
        } finally {
            setRetrying(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(checkHealth, 30000); // Check every 30s
        checkHealth();
        return () => clearInterval(interval);
    }, []);

    if (!isOffline) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020205]/80 backdrop-blur-xl"
            >
                <div className="text-center p-12 rounded-[32px] border border-white/10 bg-white/5 shadow-2xl max-w-md">
                    <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse" />
                        <div className="relative bg-red-500/10 p-6 rounded-full border border-red-500/20">
                            <WifiOff className="w-12 h-12 text-red-500" />
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-bold text-white mb-4">Núcleo Desconectado</h2>
                    <p className="text-white/60 mb-8 leading-relaxed">
                        No se ha podido establecer conexión con el motor central de SoundVzn. 
                        Es posible que el servidor esté en mantenimiento o haya un problema de red.
                    </p>

                    <button 
                        onClick={() => { setRetrying(true); checkHealth(); }}
                        disabled={retrying}
                        className="w-full py-4 px-8 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {retrying ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Zap className="w-5 h-5" />
                        )}
                        Reintentar Conexión
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
