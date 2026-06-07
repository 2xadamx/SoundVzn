import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/player';
import { Activity, Clock, TrendingUp, Music4, Sliders, ChevronDown, Move, Lock, Unlock, Sparkles } from 'lucide-react';
import { getAllTracks } from '../../utils/database';
import { EQ_PRESETS } from '../../utils/audioProcessor';
import clsx from 'clsx';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatHours = (h: number) => h >= 1 ? `${h.toFixed(1)}h` : `${Math.round(h * 60)}m`;

// ─── Listening Stats ──────────────────────────────────────────────────────────

const ListeningStats: React.FC = () => {
    const [stats, setStats] = useState({ totalHours: 0, topGenre: '—', topArtist: '—' });
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const loadStats = async () => {
        try {
            const tracks = await getAllTracks();
            if (!tracks.length) return;

            // Total hours = sum(playCount * duration) / 3600
            const totalSecs = tracks.reduce((acc, t) => acc + (t.playCount || 0) * (t.duration || 180), 0);
            const totalHours = totalSecs / 3600;

            // Top genre
            const genreCounts: Record<string, number> = {};
            for (const t of tracks) {
                if (t.genre) genreCounts[t.genre] = (genreCounts[t.genre] || 0) + (t.playCount || 1);
            }
            const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

            // Top artist (last 30 days)
            const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
            const recentArtists: Record<string, number> = {};
            for (const t of tracks) {
                if ((t.lastPlayed || 0) >= cutoff && t.artist) {
                    recentArtists[t.artist] = (recentArtists[t.artist] || 0) + (t.playCount || 1);
                }
            }
            const topArtist = Object.entries(recentArtists).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

            setStats({ totalHours, topGenre, topArtist });
        } catch (e) { /* silencioso */ }
    };

    useEffect(() => {
        loadStats();
    }, [currentTrack?.id]);

    const statItems = [
        { icon: Clock, label: 'Tiempo total', value: formatHours(stats.totalHours) },
        { icon: Music4, label: 'Género favorito', value: stats.topGenre },
        { icon: TrendingUp, label: 'Artista del mes', value: stats.topArtist },
    ];

    return (
        <div className="grid grid-cols-3 gap-4">
            {statItems.map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-black/20 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2 opacity-40">
                        <Icon size={11} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
                    </div>
                    <p className="text-sm font-bold text-white truncate" title={value}>{value}</p>
                </div>
            ))}
        </div>
    );
};
// ─── Spatial 360 ──────────────────────────────────────────────────────────────

const Spatial360: React.FC = () => {
    const { audioSettings, updateAudioSettings } = usePlayerStore();
    const pos = audioSettings.spatialSettings || { x: 0, y: 0, z: 1 };
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDrag = (_: any, info: any) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const size = rect.width;

        const centerX = rect.left + size / 2;
        const centerY = rect.top + size / 2;

        const relX = (info.point.x - centerX) / (size / 2) * 10;
        const relZ = (info.point.y - centerY) / (size / 2) * 10;

        updateAudioSettings({
            spatialSettings: {
                x: Math.max(-10, Math.min(10, relX)),
                z: Math.max(-10, Math.min(10, relZ)),
                y: pos.y
            }
        });
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                ref={containerRef}
                className="w-48 h-48 rounded-full border border-white/10 bg-black/40 relative flex items-center justify-center overflow-hidden"
            >
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white" />
                    <div className="absolute left-1/2 top-0 h-full w-px bg-white" />
                    <div className="absolute inset-4 rounded-full border border-white" />
                    <div className="absolute inset-12 rounded-full border border-white" />
                </div>

                <div className="z-10 text-primary-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                    <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center border border-primary-500/30">
                        <Activity size={14} />
                    </div>
                </div>

                <motion.div
                    drag
                    dragConstraints={containerRef}
                    dragMomentum={false}
                    onDrag={handleDrag}
                    style={{
                        x: (pos.x / 10) * 80,
                        y: (pos.z / 10) * 80,
                    }}
                    className="absolute z-20 cursor-grab active:cursor-grabbing"
                >
                    <div className="w-6 h-6 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] flex items-center justify-center border border-dark-950">
                        <Music4 size={10} className="text-dark-950" />
                    </div>
                    <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-white/30 -z-10"
                    />
                </motion.div>

                <div className="absolute bottom-2 inset-x-0 text-center">
                    <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.2em]">3D Soundstage</span>
                </div>
            </div>

            <div className="flex gap-4 w-full px-2">
                <div className="flex-1 space-y-1">
                    <p className="text-[8px] font-bold text-white/30 uppercase">Elevación (Y)</p>
                    <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.1"
                        value={pos.y}
                        onChange={(e) => updateAudioSettings({
                            spatialSettings: { ...pos, y: parseFloat(e.target.value) }
                        })}
                        className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary-500"
                    />
                </div>
            </div>
        </div>
    );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export const AudioEngineDashboard: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { analyser, isPlaying, eqSettings, updateEQSettings, moodLock, currentMood, setMoodLock } = usePlayerStore();
    const animationRef = useRef<number>();
    const [stats, setStats] = useState({ bitrate: '—', latency: '—ms', load: '—%' });
    const [showPresets, setShowPresets] = useState(false);

    useEffect(() => {
        if (!canvasRef.current || !analyser) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const timeData = new Uint8Array(analyser.fftSize);
        let frame = 0;

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            frame++;

            if (isPlaying) {
                analyser.getByteFrequencyData(dataArray);
                analyser.getByteTimeDomainData(timeData);
            } else {
                dataArray.fill(0);
                timeData.fill(128);
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Waveform suave
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(255,255,255,${isPlaying ? 0.25 : 0.05})`;
            ctx.beginPath();
            const slice = canvas.width / analyser.fftSize;
            let x = 0;
            for (let i = 0; i < analyser.fftSize; i++) {
                const v = timeData[i] / 128.0;
                const y = v * (canvas.height / 2);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += slice;
            }
            ctx.stroke();

            // Barras de frecuencia minimalistas
            const bars = 48;
            const barW = canvas.width / bars;
            for (let i = 0; i < bars; i++) {
                const idx = Math.floor((i / bars) * bufferLength);
                const v = dataArray[idx];
                const h = (v / 255) * canvas.height * 0.75;
                const alpha = (v / 255) * 0.35;
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.fillRect(i * barW + 1, canvas.height - h, barW - 2, h);
            }

            // Update stats cada ~60 frames
            if (frame % 60 === 0 && isPlaying) {
                setStats({
                    bitrate: '320',
                    latency: `${Math.floor(8 + Math.random() * 10)}`,
                    load: `${(1.2 + Math.random() * 2.5).toFixed(1)}`,
                });
            }
        };

        draw();
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, [analyser, isPlaying]);

    return (
        <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/[0.07] overflow-hidden">
            {/* Header row */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400' : 'bg-white/20'} ${isPlaying ? 'shadow-[0_0_8px_rgba(52,211,153,0.6)]' : ''}`} />
                    <div>
                        <p className="text-xs font-bold text-white/70 tracking-tight">Motor de audio</p>
                        <p className="text-[9px] text-white/25 uppercase tracking-widest">{isPlaying ? 'Activo' : 'Standby'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                    {[
                        { label: 'kbps', value: isPlaying ? stats.bitrate : '—' },
                        { label: 'ms', value: isPlaying ? stats.latency : '—' },
                        { label: '%', value: isPlaying ? stats.load : '—' },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <p className="text-xs font-bold text-white/80 font-mono">{value}<span className="text-white/25 text-[9px] ml-0.5">{label}</span></p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Canvas visualizer */}
            <div className="h-20 bg-black/20 relative overflow-hidden">
                <canvas ref={canvasRef} width={600} height={80} className="w-full h-full opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 pointer-events-none" />
            </div>

            {/* EQ Section */}
            <div className="px-6 py-5 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Sliders size={12} className="text-white/30" />
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Ecualizador 10 Bandas</p>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowPresets(!showPresets)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider"
                        >
                            Preset: {eqSettings.preset}
                            <ChevronDown size={10} className={clsx("transition-transform", showPresets && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                            {showPresets && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full right-0 mb-2 w-40 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-1"
                                >
                                    {Object.keys(EQ_PRESETS).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => {
                                                updateEQSettings({
                                                    preset: p as any,
                                                    enabled: true,
                                                    bands: (EQ_PRESETS as any)[p].map((gain: number, i: number) => ({
                                                        frequency: eqSettings.bands[i].frequency,
                                                        gain,
                                                        q: 1
                                                    }))
                                                });
                                                setShowPresets(false);
                                            }}
                                            className={clsx(
                                                "w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors",
                                                eqSettings.preset === p ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"
                                            )}
                                        >
                                            {p.replace('_', ' ')}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="flex items-end justify-between gap-1 h-32 px-1">
                    {eqSettings.bands.map((band, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                            <div className="relative w-full h-full flex flex-col items-center">
                                {/* Slider Track */}
                                <div className="absolute inset-y-0 w-[2px] bg-white/5 rounded-full" />

                                {/* Vertical Slider */}
                                <input
                                    type="range"
                                    min="-12"
                                    max="12"
                                    step="0.5"
                                    value={band.gain}
                                    onChange={(e) => {
                                        const newBands = [...eqSettings.bands];
                                        newBands[i] = { ...newBands[i], gain: parseFloat(e.target.value) };
                                        updateEQSettings({ bands: newBands, preset: 'custom' });
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-10"
                                    style={{ direction: 'rtl', writingMode: 'vertical-lr' as any }}
                                />

                                {/* Visual Slider Thumb/Track */}
                                <div
                                    className="w-1.5 bg-gradient-to-t from-primary-500 to-primary-300 rounded-full transition-all duration-300 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    style={{
                                        height: `${((band.gain + 12) / 24) * 100}%`,
                                        marginTop: 'auto'
                                    }}
                                />
                            </div>
                            <span className="text-[7px] text-white/20 font-bold tracking-tighter w-full text-center truncate">
                                {band.frequency < 1000 ? band.frequency : `${band.frequency / 1000}k`}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Listening stats */}
            <div className="px-6 py-5 border-t border-white/[0.06]">
                <div className="flex items-center gap-2 mb-4">
                    <Activity size={12} className="text-white/30" />
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Estadísticas de escucha</p>
                </div>
                <ListeningStats />
            </div>

            {/* Smart Mood Detection Section */}
            <div className="px-6 py-5 border-t border-white/[0.06] bg-primary-500/5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-primary-400" />
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Inteligencia de Ánimo</p>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                        <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">Vibe Actual:</span>
                        <span className="text-[8px] font-bold text-primary-400 uppercase tracking-wider">
                            {currentMood || 'Neutral'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 group hover:border-primary-500/30 transition-all">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white/90 mb-1 flex items-center gap-1.5">
                            Vibe Lock (Bloqueo de Ánimo)
                            {moodLock ? <Lock size={10} className="text-primary-400" /> : <Unlock size={10} className="text-white/20" />}
                        </span>
                        <span className="text-[10px] text-white/30 leading-tight">
                            {moodLock
                                ? `Fijado en mood ${currentMood}. Manteniendo la energía.`
                                : 'Auto-Queue seleccionará pistas basadas en la vibración de la sesión.'}
                        </span>
                    </div>

                    <button
                        onClick={() => setMoodLock(!moodLock)}
                        className={clsx(
                            "relative w-10 h-5 rounded-full transition-colors duration-300 flex items-center px-1",
                            moodLock ? "bg-primary-500" : "bg-white/10"
                        )}
                    >
                        <motion.div
                            animate={{ x: moodLock ? 20 : 0 }}
                            className="w-3 h-3 rounded-full bg-white shadow-lg"
                        />
                    </button>
                </div>
            </div>

            {/* Spatial Audio Section */}
            <div className="px-6 py-5 border-t border-white/[0.06]">
                <div className="flex items-center gap-2 mb-6">
                    <Move size={12} className="text-white/30" />
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Simulación Espacial (360°)</p>
                </div>
                <Spatial360 />
            </div>
        </div>
    );
};
