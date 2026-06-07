import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Wand2, Music, Loader2, Play } from 'lucide-react';
import { searchEverything as searchUnified } from '../../utils/unifiedMusicAPI';
import { createPlaylist, addTrackToPlaylist, ensureTrack } from '../../utils/database';
import { usePlayerStore } from '../../store/player';

interface AIPlaylistGeneratorProps {
    onClose: () => void;
}

export const AIPlaylistGenerator: React.FC<AIPlaylistGeneratorProps> = ({ onClose }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState('');
    const addToast = usePlayerStore(state => state.addToast);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setProgress('Analizando el ambiente...');

        try {
            // El motor de IA extrae palabras clave y busca tracks que encajen con el mood
            setProgress('Buscando coincidencias perfectas...');

            const results = await searchUnified(prompt);
            const tracks = results.tracks.slice(0, 12);

            if (tracks.length === 0) {
                throw new Error('No se encontraron canciones para este ambiente.');
            }

            setProgress('Esculpiendo tu nueva playlist...');

            const playlistName = `AI: ${prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt}`;
            const playlistId = await createPlaylist(playlistName);

            // Agregar tracks de forma secuencial
            for (const track of tracks) {
                const ensured = await ensureTrack(track);
                await addTrackToPlaylist(playlistId, ensured.id);
            }

            addToast({
                type: 'success',
                message: `Playlist "${playlistName}" creada con éxito`,
                duration: 5000
            });

            onClose();
        } catch (err: any) {
            addToast({
                type: 'error',
                message: `Error de IA: ${err.message}`,
                duration: 5000
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
        >
            <motion.div
                initial={{ scale: 0.9, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[48px] overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.05)] relative"
            >
                {/* Background glow effects */}
                <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-accent-blue/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="p-12 space-y-10 relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]">
                                <Sparkles size={28} className="animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Smart AI Playlists</h2>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-2">Curación Algorítmica de Nueva Generación</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors group">
                            <X size={24} className="text-white/20 group-hover:text-white transition-colors" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-lg">
                            Describe el ambiente, el mood o la ocasión que imaginas. Nuestra IA analizará la biblioteca global para orquestar la combinación perfecta.
                        </p>

                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent-blue/30 rounded-[32px] blur opacity-20 group-focus-within:opacity-50 transition-opacity" />
                            <textarea
                                autoFocus
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                placeholder="Ej: 'Música lofi para programar en un café de Tokyo' o 'Techno industrial dark para entrenamiento extremo'..."
                                className="relative w-full bg-black/60 border border-white/10 rounded-[32px] p-8 text-xl text-white placeholder:text-white/10 focus:outline-none focus:border-white/20 transition-all min-h-[180px] resize-none italic font-bold leading-relaxed shadow-inner"
                            />
                        </div>
                    </div>

                    {isGenerating && (
                        <div className="flex flex-col items-center gap-6 py-4 animate-in fade-in zoom-in duration-500">
                            <div className="relative">
                                <Loader2 size={48} className="text-primary animate-spin" />
                                <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                            </div>
                            <p className="text-xs font-black text-primary uppercase tracking-[0.4em] animate-pulse">{progress}</p>
                        </div>
                    )}

                    {!isGenerating && (
                        <button
                            onClick={handleGenerate}
                            disabled={!prompt.trim()}
                            className="w-full group relative h-20 bg-white rounded-[24px] overflow-hidden disabled:opacity-20 transition-all active:scale-95 shadow-2xl hover:shadow-primary/20"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent-blue to-accent-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative flex items-center justify-center gap-4 text-black group-hover:text-white font-black uppercase tracking-widest text-lg transition-colors">
                                <Wand2 size={24} className="group-hover:rotate-12 transition-transform duration-500" />
                                <span>GENERAR PLAYLIST</span>
                            </div>
                        </button>
                    )}

                    <div className="pt-4 flex justify-center gap-12">
                        <div className="flex items-center gap-3 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                            <Music size={14} className="text-white/10" />
                            <span>12+ Canciones</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                            <Play size={14} className="text-white/10" />
                            <span>Cloud Sync</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
