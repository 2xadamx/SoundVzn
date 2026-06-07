import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Music, User, Disc, Wand2, Download } from 'lucide-react';
import { usePlayerStore } from '../../store/player';
import { updateTrackMetadata } from '../../utils/database';

interface MetadataEditorProps {
    track: any;
    onClose: () => void;
    onUpdate?: () => void;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ track, onClose, onUpdate }) => {
    const [title, setTitle] = useState(track.title);
    const [artist, setArtist] = useState(track.artist);
    const [album, setAlbum] = useState(track.album || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isAnalysing, setIsAnalysing] = useState(false);
    const { addToast, audioSettings, eqSettings } = usePlayerStore();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const { AudioExportEngine } = await import('../../utils/AudioExportEngine');
            const blob = await AudioExportEngine.exportRemaster(track.filePath, {
                volume: audioSettings.volume,
                eqEnabled: eqSettings.enabled,
                eqBands: eqSettings.bands,
                reverbPreset: (usePlayerStore.getState() as any).reverbPreset
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${artist} - ${title} (SoundVzn Remaster).wav`;
            a.click();
            URL.revokeObjectURL(url);

            addToast({
                type: 'success',
                message: 'Exportación completada con éxito 🎧',
                duration: 5000
            });
        } catch (err: any) {
            console.error('Export failed:', err);
            addToast({
                type: 'error',
                message: `Error al exportar: ${err.message}`,
                duration: 5000
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleAutoIdentify = async () => {
        setIsAnalysing(true);
        try {
            const { FingerprintEngine } = await import('../../utils/FingerprintEngine');
            const enriched = await FingerprintEngine.enrichUnknownTrack(track);
            if (enriched) {
                setTitle(enriched.title);
                setArtist(enriched.artist);
                setAlbum(enriched.album || '');
                addToast({
                    type: 'success',
                    message: 'Identificación acústica completada ✨',
                    duration: 3000
                });
            } else {
                addToast({
                    type: 'info',
                    message: 'No se pudo identificar la pista acústicamente',
                    duration: 3000
                });
            }
        } catch (err) {
            console.error('Manual fingerprinting failed:', err);
        } finally {
            setIsAnalysing(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update local database (works in both web and Electron)
            await updateTrackMetadata(track.id, { title, artist, album });

            // Also write to file if in Electron
            if ((window as any).electron?.writeMetadata) {
                await (window as any).electron.writeMetadata(track.filePath, { title, artist, album });
            }

            addToast({ type: 'success', message: 'Metadatos actualizados', duration: 3000 });
            onUpdate?.();
            onClose();
        } catch (err: any) {
            addToast({ type: 'error', message: `Error al guardar: ${err.message}`, duration: 5000 });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            >
                <div className="p-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Editar Etiquetas</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAutoIdentify}
                                disabled={isAnalysing}
                                className="p-3 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-2xl transition-all hover:scale-110 active:scale-90 border border-primary-500/20 group"
                                title="Auto-Identificar por Sonido"
                            >
                                <Wand2 size={20} className={isAnalysing ? "animate-spin" : "group-hover:rotate-12 transition-transform"} />
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-2xl transition-all hover:scale-110 active:scale-90 border border-amber-500/20 group"
                                title="Exportar Remaster (WAV)"
                            >
                                {isExporting ? (
                                    <div className="w-5 h-5 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                                ) : (
                                    <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                                )}
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <X size={24} className="text-white/40" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Título de la Pista</label>
                            <div className="relative">
                                <Music size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Nombre de la canción"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-white/10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Artista</label>
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                <input
                                    value={artist}
                                    onChange={e => setArtist(e.target.value)}
                                    placeholder="Nombre del artista"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-white/10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Álbum</label>
                            <div className="relative">
                                <Disc size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                <input
                                    value={album}
                                    onChange={e => setAlbum(e.target.value)}
                                    placeholder="Nombre del álbum"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-white/10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-[10px] text-amber-500/60 text-center italic leading-relaxed">
                        Los cambios se escribirán físicamente en el archivo local.<br />
                        Asegúrate de tener permisos de escritura.
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={20} />
                                <span>GUARDAR CAMBIOS</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
