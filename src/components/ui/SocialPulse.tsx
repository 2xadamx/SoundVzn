import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Zap, BadgeCheck, Star, Heart, Activity } from 'lucide-react';

interface SocialUser {
    id: string;
    name: string;
    avatar: string;
    track: string;
    artist: string;
    isListening: boolean;
    color: string;
    badge?: 'pro' | 'artist' | 'curator';
    genres: string[];
    listeners: number;
}

const INITIAL_USERS: SocialUser[] = [
    {
        id: '1', name: 'Alex Rivera', avatar: 'https://i.pravatar.cc/150?u=alex',
        track: 'Starlight Flicker', artist: 'Neon Dreams', isListening: true, color: '#0ea5e9',
        badge: 'pro', genres: ['Synthwave', 'Electronic'], listeners: 1240
    },
    {
        id: '2', name: 'Elena Chen', avatar: 'https://i.pravatar.cc/150?u=elena',
        track: 'Midnight City', artist: 'M83', isListening: true, color: '#ec4899',
        badge: 'artist', genres: ['Dream Pop', 'Indie'], listeners: 45200
    },
    {
        id: '3', name: 'Marcus Vogt', avatar: 'https://i.pravatar.cc/150?u=marcus',
        track: 'Techno Pulse', artist: 'Vortex', isListening: false, color: '#10b981',
        badge: 'curator', genres: ['Techno', 'Industrial'], listeners: 890
    },
    {
        id: '4', name: 'Sofia Bell', avatar: 'https://i.pravatar.cc/150?u=sofia',
        track: 'Aura Ambient', artist: 'Zenith', isListening: true, color: '#f59e0b',
        genres: ['Ambient', 'Lo-fi'], listeners: 3200
    },
];

export const SocialPulse: React.FC = () => {
    const [users, setUsers] = useState<SocialUser[]>(INITIAL_USERS);
    const [hoveredUser, setHoveredUser] = useState<SocialUser | null>(null);

    // Simulate "Real-time" Activity
    useEffect(() => {
        const interval = setInterval(() => {
            setUsers(prev => prev.map(user => {
                if (Math.random() > 0.8) {
                    return {
                        ...user,
                        isListening: Math.random() > 0.2,
                        track: Math.random() > 0.5 ? user.track : 'Switching...'
                    };
                }
                return user;
            }));
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mt-8 relative">
            <h3 className="px-5 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                <span>Social Pulse</span>
                <span className="flex items-center gap-1 text-primary-500/50">
                    <Zap size={10} fill="currentColor" />
                    LIVE
                </span>
            </h3>

            <div className="space-y-1">
                {users.map((user) => (
                    <div
                        key={user.id}
                        onMouseEnter={() => setHoveredUser(user)}
                        onMouseLeave={() => setHoveredUser(null)}
                        className="relative"
                    >
                        <motion.div
                            layout
                            className="group relative px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-2xl transition-all"
                        >
                            <div className="relative shrink-0">
                                <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 group-hover:border-white/20 transition-colors">
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                </div>
                                {user.isListening && (
                                    <span
                                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#121214] z-10"
                                        style={{ backgroundColor: user.color }}
                                    />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h4 className="text-[13px] font-bold text-white/80 group-hover:text-white truncate transition-colors">
                                        {user.name}
                                    </h4>
                                    {user.badge === 'pro' && <BadgeCheck size={12} className="text-blue-400" />}
                                    {user.badge === 'artist' && <Star size={12} className="text-purple-400" />}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {user.isListening ? (
                                        <>
                                            <Music size={10} className="text-primary-400 shrink-0" />
                                            <p className="text-[10px] text-primary-400/80 font-medium truncate italic">
                                                {user.track}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-[10px] text-white/20 font-medium">Offline</p>
                                    )}
                                </div>
                            </div>

                            {user.isListening && (
                                <div className="flex items-end gap-[2px] h-2.5 pb-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
                                    {[1, 2, 3].map(i => (
                                        <motion.div
                                            key={i}
                                            animate={{ height: [2, 8, 4, 8, 2] }}
                                            transition={{ repeat: Infinity, duration: 0.8 + i * 0.2 }}
                                            className="w-[2px] bg-primary-500 rounded-full"
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>

                        {/* Hover Card / Profile Card */}
                        <AnimatePresence>
                            {hoveredUser?.id === user.id && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                                    className="absolute left-full ml-4 top-0 w-64 p-5 rounded-[24px] bg-dark-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl z-50 pointer-events-none"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/20">
                                            <img src={user.avatar} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-black text-white">{user.name}</h5>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{user.badge || 'User'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {user.genres.map(g => (
                                                <span key={g} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[9px] text-white/60 font-bold uppercase tracking-tighter">
                                                    {g}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-1 text-red-400 mb-0.5">
                                                    <Heart size={10} fill="currentColor" />
                                                    <span className="text-[10px] font-black">{Math.floor(user.listeners / 10)}</span>
                                                </div>
                                                <span className="text-[8px] text-white/20 uppercase font-black">Likes</span>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-1 text-primary-400 mb-0.5">
                                                    <Activity size={10} />
                                                    <span className="text-[10px] font-black">{user.listeners.toLocaleString()}</span>
                                                </div>
                                                <span className="text-[8px] text-white/20 uppercase font-black">Plays</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-white/5">
                                        <p className="text-[9px] text-white/40 leading-relaxed italic">
                                            "Escuchando música de alta fidelidad en SoundVizion"
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );
};
