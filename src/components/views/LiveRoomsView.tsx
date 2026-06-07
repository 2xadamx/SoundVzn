import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/player';
import { Users, MessageCircle, Share2, PlayCircle, MousePointer2 } from 'lucide-react';
import clsx from 'clsx';
import { HolographicArt } from '../player/HolographicArt';

interface LiveRoomsViewProps {
    onNavigate: (view: string, params?: any) => void;
}

interface FakeUser {
    id: string;
    name: string;
    avatar: string;
    color: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
}

const FAKE_USERS_DATA = [
    { id: 'u1', name: 'AlexTheDJ', avatar: 'https://i.pravatar.cc/150?u=1', color: '#ec4899' },
    { id: 'u2', name: 'SynthWave99', avatar: 'https://i.pravatar.cc/150?u=2', color: '#06b6d4' },
    { id: 'u3', name: 'BassJunkie', avatar: 'https://i.pravatar.cc/150?u=3', color: '#10b981' },
    { id: 'u4', name: 'LoFi_Girl', avatar: 'https://i.pravatar.cc/150?u=4', color: '#f59e0b' },
];

export const LiveRoomsView: React.FC<LiveRoomsViewProps> = ({ onNavigate }) => {
    const { currentTrack, isPlaying } = usePlayerStore();
    const [users, setUsers] = useState<FakeUser[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize random positions
    useEffect(() => {
        const initialUsers = FAKE_USERS_DATA.map(u => ({
            ...u,
            x: Math.random() * 80 + 10, // percentages 10-90
            y: Math.random() * 80 + 10,
            targetX: Math.random() * 80 + 10,
            targetY: Math.random() * 80 + 10,
        }));
        setUsers(initialUsers);
    }, []);

    // Simulate cursor movements
    useEffect(() => {
        const interval = setInterval(() => {
            setUsers(prev => prev.map(u => {
                // Have they reached target? (approx)
                const dx = u.targetX - u.x;
                const dy = u.targetY - u.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let newTargetX = u.targetX;
                let newTargetY = u.targetY;

                // If close to target, pick new target randomly occasionally
                if (dist < 5 && Math.random() > 0.5) {
                    newTargetX = Math.random() * 80 + 10;
                    newTargetY = Math.random() * 80 + 10;
                }

                // Move 10% towards target (lerp)
                const moveX = u.x + (newTargetX - u.x) * 0.1;
                const moveY = u.y + (newTargetY - u.y) * 0.1;

                return {
                    ...u,
                    x: moveX,
                    y: moveY,
                    targetX: newTargetX,
                    targetY: newTargetY
                };
            }));
        }, 100);

        return () => clearInterval(interval);
    }, []);

    if (!currentTrack) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <Users size={64} className="text-white/20 mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">Salas en Vivo</h2>
                <p className="text-white/40 max-w-md">Reproduce una canción para comenzar una sala de escucha global y conectar con otros que disfrutan la misma vibra.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col relative animate-in fade-in duration-700 max-w-7xl mx-auto w-full">

            <header className="flex items-center justify-between mb-8 z-20 relative">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="text-primary w-6 h-6" />
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary uppercase tracking-[0.2em]">
                            Global Room
                        </h2>
                    </div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter">
                        Listening Party
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                        <span className="text-white/60 text-sm font-bold">5 Oyentes en Vivo</span>
                    </div>
                    <button className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50 transition-colors p-3 rounded-full">
                        <Share2 size={20} />
                    </button>
                </div>
            </header>

            {/* Collaborative Canvas */}
            <div
                ref={containerRef}
                className="flex-1 relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden flex items-center justify-center shadow-2xl"
            >
                {/* Background Artwork reflection */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-20 blur-3xl saturate-200"
                    style={{ backgroundImage: `url(${currentTrack.artwork})` }}
                />

                {/* Center Stage: The Track */}
                <div className="relative z-10 flex flex-col items-center cursor-pointer" onClick={() => onNavigate?.('glass-center')}>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={clsx(
                            "relative w-64 h-64 lg:w-96 lg:h-96 rounded-full border-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-700",
                            isPlaying ? "border-primary/50 shadow-[0_0_80px_rgba(168,85,247,0.4)]" : "border-white/10"
                        )}
                    >
                        <HolographicArt
                            src={currentTrack.artwork || ''}
                            alt={currentTrack.title}
                            isPlaying={isPlaying}
                            className="w-full h-full"
                        />

                        {/* Center Hole of Vinyl */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 bg-black rounded-full border border-white/20 shadow-inner flex items-center justify-center">
                                {!isPlaying && <PlayCircle className="text-white/50 w-6 h-6 ml-1" />}
                            </div>
                        </div>
                    </motion.div>

                    <div className="mt-8 text-center px-4 max-w-md">
                        <h3 className="text-3xl font-black text-white italic truncate">{currentTrack.title}</h3>
                        <p className="text-white/50 font-bold truncate mt-1">{currentTrack.artist}</p>
                    </div>
                </div>

                {/* Fake Cursors overlay */}
                <AnimatePresence>
                    {users.map(user => (
                        <div
                            key={user.id}
                            className="absolute z-20 pointer-events-none transform transition-transform duration-100 ease-linear"
                            style={{
                                left: `${user.x}%`,
                                top: `${user.y}%`,
                            }}
                        >
                            <MousePointer2
                                className="w-5 h-5 drop-shadow-md -ml-2 -mt-2"
                                style={{ fill: user.color, color: 'white', strokeWidth: 1.5 }}
                            />
                            <div
                                className="mt-1 ml-3 px-2 py-1 rounded-md text-[10px] font-bold text-white shadow-lg flex items-center gap-2 max-w-[120px]"
                                style={{ backgroundColor: user.color }}
                            >
                                <img src={user.avatar} className="w-4 h-4 rounded-full border border-white/30" />
                                <span className="truncate">{user.name}</span>
                            </div>
                        </div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Chat Simulation Area */}
            <div className="h-24 mt-6 bg-white/5 border border-white/10 rounded-[1.5rem] flex items-center px-6 gap-4">
                <img src="https://i.pravatar.cc/150?u=me" className="w-10 h-10 rounded-full border-2 border-primary/50" />
                <div className="flex-1 bg-black/50 border border-white/10 rounded-full px-6 py-3 text-white/40 text-sm flex items-center gap-2">
                    <MessageCircle size={16} /> Escribe algo al chat de la sala...
                </div>
            </div>

        </div>
    );
};
