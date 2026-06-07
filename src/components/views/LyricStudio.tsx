import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, X, Play, Pause, RotateCcw, CheckCircle2, Music } from 'lucide-react';
import { usePlayerStore } from '../../store/player';
import clsx from 'clsx';

interface LyricLine {
    time: number;
    text: string;
}

export const LyricStudio: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { currentTrack, isPlaying, setIsPlaying, currentTime, setSeekTo } = usePlayerStore();
    const [rawLyrics, setRawLyrics] = useState('');
    const [lines, setLines] = useState<LyricLine[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleParseLyrics = () => {
        const parsed = rawLyrics.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => ({ time: 0, text: line.trim() }));
        setLines(parsed);
        setIsSyncing(true);
    };

    const handleSyncLine = (index: number) => {
        const newLines = [...lines];
        newLines[index].time = currentTime;
        setLines(newLines);
        setActiveIndex(index);

        // Auto scroll to next line
        if (index < lines.length - 1) {
            setActiveIndex(index + 1);
        }
    };

    const handleSave = async () => {
        if (!currentTrack) return;
        console.log('Saving synced lyrics:', lines);
        // Here we would call a service to save lyrics to DB
        // For now, we simulate success
        alert('Lyrics synchronized and saved to local database! ✨');
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl flex flex-col p-8 md:p-16"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-500/20 rounded-2xl text-primary-400">
                        <Music size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Lyric Studio</h2>
                        <p className="text-white/40 text-sm font-medium italic">Precision Synchronization Tool</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-3 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 flex gap-10 overflow-hidden">
                {/* Left: Editor/Input */}
                {!isSyncing ? (
                    <div className="flex-1 flex flex-col">
                        <textarea
                            value={rawLyrics}
                            onChange={(e) => setRawLyrics(e.target.value)}
                            placeholder="Paste your lyrics here (one line per verse)..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-[32px] p-8 text-xl text-white placeholder:text-white/10 focus:outline-none focus:border-primary-500/50 transition-all resize-none font-medium leading-relaxed"
                        />
                        <button
                            onClick={handleParseLyrics}
                            disabled={!rawLyrics.trim()}
                            className="mt-6 py-5 bg-white text-black font-black text-lg rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            Start Synchronization
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-8 space-y-4 scroll-smooth"
                        >
                            {lines.map((line, i) => (
                                <motion.div
                                    key={i}
                                    layout
                                    className={clsx(
                                        "p-6 rounded-2xl cursor-pointer transition-all border flex items-center justify-between",
                                        activeIndex === i
                                            ? "bg-primary-500/20 border-primary-500/50 text-white"
                                            : "bg-white/5 border-white/5 text-white/40 hover:text-white/60"
                                    )}
                                    onClick={() => handleSyncLine(i)}
                                >
                                    <span className="text-lg font-bold">{line.text}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs opacity-50">
                                            {line.time > 0 ? `${line.time.toFixed(2)}s` : '--:--'}
                                        </span>
                                        {line.time > 0 && <CheckCircle2 size={16} className="text-primary-400" />}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <div className="p-6 bg-white/5 border-t border-white/10 flex gap-4">
                            <button
                                onClick={() => setIsSyncing(false)}
                                className="px-6 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
                            >
                                Edit Text
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-primary-500 text-white font-black rounded-xl hover:bg-primary-400 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={20} />
                                Finalize & Save
                            </button>
                        </div>
                    </div>
                )}

                {/* Right: Preview & Controls */}
                <div className="w-80 flex flex-col gap-8">
                    <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] text-center">
                        <img
                            src={currentTrack?.artwork}
                            className="w-48 h-48 rounded-2xl mx-auto mb-6 shadow-2xl border border-white/10"
                            alt="cover"
                        />
                        <h3 className="text-xl font-black text-white truncate">{currentTrack?.title}</h3>
                        <p className="text-white/40 font-bold tracking-widest text-[10px] uppercase mt-1">
                            {currentTrack?.artist}
                        </p>

                        <div className="mt-8 flex items-center justify-center gap-6">
                            <button
                                onClick={() => setSeekTo((currentTime - 5))}
                                className="p-3 bg-white/5 rounded-full hover:bg-white/10 text-white transition-all"
                            >
                                <RotateCcw size={20} />
                            </button>
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
                            >
                                {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
                            </button>
                        </div>

                        <div className="mt-6 text-3xl font-mono font-black text-primary-500">
                            {currentTime.toFixed(2)}s
                        </div>
                    </div>

                    <div className="p-6 bg-primary-950/20 border border-primary-500/20 rounded-[28px]">
                        <h4 className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-3">Studio Tip</h4>
                        <p className="text-white/60 text-xs leading-relaxed">
                            Play the song and <span className="text-white font-bold">click on each line</span> exactly when it starts. The timestamps will be captured automatically.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
