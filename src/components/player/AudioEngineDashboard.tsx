import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/player';
import { Activity, Clock, TrendingUp, Music4 } from 'lucide-react';
import { getAllTracks } from '../../utils/database';

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export const AudioEngineDashboard: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyser = usePlayerStore((state) => state.analyser);
    const isPlaying = usePlayerStore((state) => state.isPlaying);
    const animationRef = useRef<number>();
    const [stats, setStats] = useState({ bitrate: '—', latency: '—ms', load: '—%' });

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

            {/* Listening stats */}
            <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                    <Activity size={12} className="text-white/30" />
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Estadísticas de escucha</p>
                </div>
                <ListeningStats />
            </div>
        </div>
    );
};
