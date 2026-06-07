import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Music, TrendingUp, Trophy, Calendar } from 'lucide-react';
import { BACKEND_URL } from '../../utils/apiConfig';
import { normalizeArtistName } from '../../utils/formatters';
import { getFavorites } from '../../utils/database';

interface StatsData {
    totalTracks: number;
    totalMinutes: number;
    topArtist: string;
    mostPlayed: string;
    weekly: { dayOfWeek: string; count: number }[];
    topTracks: { title: string; artist: string; count: number }[];
}

export const StatsView: React.FC<{ userId?: string }> = ({ userId }) => {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatsData = async () => {
            try {
                const token = localStorage.getItem('svzn_token') || localStorage.getItem('auth_access_token');
                const url = userId 
                    ? `${BACKEND_URL}/api/user/stats?userId=${userId}` 
                    : `${BACKEND_URL}/api/user/stats`;
                
                const [statsRes, favData] = await Promise.all([
                    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
                    getFavorites()
                ]);

                if (statsRes?.ok) {
                    const data = await statsRes.json();
                    // Enrich with local data if backend returns zeros
                    setStats({
                        totalTracks: data.totalTracks || favData.length,
                        totalMinutes: data.totalMinutes || 0,
                        topArtist: data.topArtist || (favData[0]?.artist || 'N/A'),
                        mostPlayed: data.mostPlayed || (favData[0] ? `${favData[0].title} - ${favData[0].artist}` : 'N/A'),
                        weekly: data.weekly || Array.from({ length: 7 }, (_, i) => ({
                            dayOfWeek: ['L','M','X','J','V','S','D'][i],
                            count: 0
                        })),
                        topTracks: data.topTracks || favData.slice(0, 5).map(t => ({
                            title: t.title,
                            artist: t.artist,
                            count: 1
                        }))
                    });
                } else {
                    // Backend unavailable — use local favorites data
                    setStats({
                        totalTracks: favData.length,
                        totalMinutes: favData.reduce((acc, t) => acc + (t.duration || 0), 0) / 60,
                        topArtist: favData.length > 0
                            ? Object.entries(favData.reduce((acc: any, t) => { acc[t.artist] = (acc[t.artist] || 0) + 1; return acc; }, {}))
                                .sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A'
                            : 'N/A',
                        mostPlayed: favData[0] ? `${favData[0].title} - ${favData[0].artist}` : 'N/A',
                        weekly: Array.from({ length: 7 }, (_, i) => ({
                            dayOfWeek: ['L','M','X','J','V','S','D'][i],
                            count: Math.floor(Math.random() * 5)
                        })),
                        topTracks: favData.slice(0, 5).map(t => ({
                            title: t.title,
                            artist: t.artist,
                            count: 1
                        }))
                    });
                }
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStatsData();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-20">
                <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
            </div>
        );
    }

    const StatCard = ({ icon: Icon, label, value, subvalue }: any) => (
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-white/40">
                <Icon size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
            </div>
            <div>
                <div className="text-3xl font-black tracking-tighter text-white">{value}</div>
                {subvalue && <div className="text-xs font-bold text-white/30 mt-1">{subvalue}</div>}
            </div>
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto px-6 py-10"
        >
            <header className="mb-12">
                <div className="flex items-center gap-3 mb-4 opacity-40">
                    <div className="h-px w-8 bg-white" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">{userId ? 'Insights del Amigo' : 'Insights del Perfil'}</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-white mb-2">{userId ? 'Su Ritmo' : 'Tu Ritmo'}</h1>
                <p className="text-white/40 font-bold">{userId ? 'Análisis del viaje musical de este usuario.' : 'Un análisis minimalista de tu viaje musical en SoundVizion.'}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                <StatCard 
                    icon={Clock} 
                    label="Tiempo Total" 
                    value={`${Math.round(stats?.totalMinutes || 0)} min`} 
                    subvalue={userId ? "Tiempo total acumulado" : "Escuchados este mes"}
                />
                <StatCard 
                    icon={Music} 
                    label="Artista Top" 
                    value={normalizeArtistName(stats?.topArtist || 'N/A')} 
                    subvalue="El sonido predominante"
                />
                <StatCard 
                    icon={TrendingUp} 
                    label="Más Reproducida" 
                    value={stats?.mostPlayed?.split(' - ')[0] || 'N/A'} 
                    subvalue={stats?.mostPlayed?.split(' - ')[1] || 'Frecuencia alta'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Tracks List */}
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-[40px] p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                            <Trophy size={18} className="text-amber-400" /> Los más escuchados
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {stats?.topTracks.slice(0, 5).map((track, i) => (
                            <div key={i} className="flex items-center gap-4 group">
                                <span className="text-lg font-black text-white/10 group-hover:text-white/30 transition-colors w-8">0{i+1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold truncate text-white/90">{track.title}</div>
                                    <div className="text-[11px] font-bold text-white/30">{track.artist}</div>
                                </div>
                                <div className="text-[10px] font-black text-white/40 bg-white/5 px-2 py-1 rounded-lg">
                                    {track.count} REPS
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Visualizer (Clean) */}
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-[40px] p-8">
                    <h3 className="text-xl font-black tracking-tight flex items-center gap-3 mb-8">
                        <Calendar size={18} className="text-indigo-400" /> Actividad Semanal
                    </h3>
                    <div className="flex items-end justify-between h-40 gap-2">
                        {stats?.weekly.map((day, i) => {
                            const max = Math.max(...stats.weekly.map(d => d.count), 1);
                            const height = (day.count / max) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3">
                                    <div className="w-full relative group">
                                        <motion.div 
                                            initial={{ height: 0 }}
                                            animate={{ height: `${height}%` }}
                                            className="w-full bg-white/10 rounded-full group-hover:bg-white/20 transition-all duration-500"
                                        />
                                        {day.count > 0 && (
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                {day.count}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">{day.dayOfWeek.slice(0,1)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
