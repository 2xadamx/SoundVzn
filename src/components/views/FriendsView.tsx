/**
 * FriendsView — Red Social Musical SoundVizion
 * Inspirado en: Instagram Stories + Spotify Friend Activity + Discord DMs
 * Totalmente responsive (mobile-first)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserPlus, Search, Music2, X, Edit3,
    Mic, Play, Pause, Loader2, PlayCircle,
    Heart, MessageSquare, Send, Settings, ArrowLeft,
    MoreHorizontal, Pin, Trash2, ShieldAlert, VolumeX,
    CheckCheck, Check, UserCircle, ListMusic, Users,
    ChevronLeft, Plus, Music, ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@store/auth';
import { usePlayerStore } from '@store/player';
import { socialService, SocialUser } from '../../utils/socialService';
import { useNotificationsStore } from '@store/notifications';
import { CanvasRenderer } from '../common/CanvasRenderer';

// ─── Types ────────────────────────────────────────────────────────────────────
type NoteType = 'text' | 'audio' | 'music';
type NoteTheme = 'default' | 'space' | 'rainbow' | 'ocean' | 'fire' | 'cyberpunk' | string;
interface Note {
    type: NoteType; text?: string; audioB64?: string;
    track?: string; artist?: string; cover?: string;
    previewUrl?: string; savedAt: number; theme?: NoteTheme;
}
interface Message {
    id: number; sender_id: string; receiver_id: string;
    type: 'text' | 'music'; content: string;
    track_data?: any; timestamp: number; is_read: number;
}

const MY_NOTE_KEY = 'svzn_my_note_v4';
const isNoteActive = (note: Note) => Date.now() - note.savedAt < 24 * 60 * 60 * 1000;

// ─── Note Themes ──────────────────────────────────────────────────────────────
const NOTE_THEMES = [
    { id: 'default',   label: 'Estándar', class: 'bg-[#1c1c1e] border-white/10 text-white/90' },
    { id: 'space',     label: 'Espacio',  class: 'bg-[#050508] text-white border-indigo-500/40 theme-canvas-space' },
    { id: 'rainbow',   label: 'Arcoíris', class: 'text-white border-transparent theme-canvas-rainbow' },
    { id: 'ocean',     label: 'Océano',   class: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-white border-transparent' },
    { id: 'fire',      label: 'Fuego',    class: 'bg-gradient-to-br from-orange-500 via-red-600 to-rose-700 text-white border-transparent' },
    { id: 'cyberpunk', label: 'Cyber',    class: 'bg-[#0f172a] text-cyan-400 border-cyan-500/50 theme-canvas-cyber' },
];

const getThemeClass = (id?: string, inventory: any[] = []) => {
    const t = NOTE_THEMES.find(th => th.id === id);
    if (t) return t.class;
    if (inventory.find(i => i.id === id)) return 'theme-dynamic-canvas';
    return NOTE_THEMES[0].class;
};

// ─── CSS Animations ───────────────────────────────────────────────────────────
const GlobalStyles = () => (
    <style dangerouslySetInnerHTML={{ __html: `
        .theme-canvas-space {
            background-image: radial-gradient(1px 1px at 20px 30px,#fff,rgba(0,0,0,0)),
                radial-gradient(1px 1px at 80px 60px,#fff,rgba(0,0,0,0)),
                radial-gradient(1px 1px at 140px 100px,#ddd,rgba(0,0,0,0));
            background-size:200px 200px; animation:space-drift 60s linear infinite;
        }
        @keyframes space-drift { from{background-position:0 0} to{background-position:200px 200px} }
        .theme-canvas-rainbow {
            background:linear-gradient(-45deg,#ee7752,#e73c7e,#23a6d5,#23d5ab);
            background-size:400% 400%; animation:grad-flow 15s ease infinite;
        }
        @keyframes grad-flow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .theme-canvas-cyber { background:#020617; }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.15)} }
        .animate-pulse-dot { animation:pulse-dot 2s ease-in-out infinite; }
        @keyframes music-bar { 0%,100%{height:4px} 50%{height:14px} }
        .bar1{animation:music-bar .8s ease-in-out infinite}
        .bar2{animation:music-bar .8s ease-in-out .15s infinite}
        .bar3{animation:music-bar .8s ease-in-out .3s infinite}
    `}} />
);

// ─── Shared Components ────────────────────────────────────────────────────────
const UserAvatar: React.FC<{ user: any; size?: string; className?: string }> = ({ user, size = 'w-10 h-10', className = '' }) => {
    const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    return (
        <div className={clsx('overflow-hidden rounded-xl border border-white/10 bg-white/5 flex items-center justify-center shrink-0', size, className)}>
            {user?.avatar
                ? <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                : <span className="text-[0.75em] font-black text-white/30">{initials}</span>
            }
        </div>
    );
};

const StatusDot: React.FC<{ status: SocialUser['status'] }> = ({ status }) => (
    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center bg-[#0c0c10] border border-[#0c0c10]">
        <div className={clsx('w-2 h-2 rounded-full',
            status === 'online' ? 'bg-emerald-400 animate-pulse-dot' :
            status === 'idle'   ? 'bg-amber-400' : 'bg-gray-500 opacity-40'
        )} />
    </div>
);

const MusicBars = () => (
    <div className="flex items-end gap-[2px] h-3.5">
        <div className="w-[2px] bg-primary rounded-full bar1" style={{ height: 4 }} />
        <div className="w-[2px] bg-primary rounded-full bar2" style={{ height: 4 }} />
        <div className="w-[2px] bg-primary rounded-full bar3" style={{ height: 4 }} />
    </div>
);

const formatTime = (ts: number) => {
    const d = Math.floor((Date.now() - ts) / 60000);
    if (d < 1) return 'ahora';
    if (d < 60) return `${d}m`;
    if (d < 1440) return `${Math.floor(d / 60)}h`;
    return `${Math.floor(d / 1440)}d`;
};

const formatDuration = (s: number) => {
    if (isNaN(s) || s < 0) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

// ─── Mini Audio Player ────────────────────────────────────────────────────────
const MiniAudioPlayer: React.FC<{ src: string }> = ({ src }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(30);

    const toggle = () => {
        if (!audioRef.current) return;
        if (playing) audioRef.current.pause();
        else audioRef.current.play().catch(() => {});
    };

    return (
        <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3 w-full mt-2">
            <button onClick={toggle}
                className="w-8 h-8 shrink-0 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
                {playing ? <Pause size={13} className="fill-black" /> : <Play size={13} className="ml-0.5 fill-black" />}
            </button>
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex justify-between text-[9px] font-mono text-white/30 px-0.5">
                    <span>{formatDuration(current)}</span>
                    <span>{formatDuration(duration)}</span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden cursor-pointer"
                    onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        if (audioRef.current) audioRef.current.currentTime = pct * duration;
                    }}>
                    <div className="h-full bg-white/60 rounded-full transition-all duration-75" style={{ width: `${progress}%` }} />
                </div>
            </div>
            <audio ref={audioRef} src={src} autoPlay
                onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
                onTimeUpdate={() => {
                    if (!audioRef.current) return;
                    setCurrent(audioRef.current.currentTime);
                    setProgress((audioRef.current.currentTime / duration) * 100);
                }}
                onLoadedMetadata={() => {
                    if (audioRef.current && isFinite(audioRef.current.duration))
                        setDuration(audioRef.current.duration);
                }}
            />
        </div>
    );
};

// ─── Note Bubble (Stories-style) ─────────────────────────────────────────────
const NoteBubble: React.FC<{ note: Note; inventory: any[] }> = ({ note, inventory }) => {
    const themeClass = getThemeClass(note.theme, inventory);
    const dynamicCanvas = inventory.find(i => i.id === note.theme)?.css_content;
    return (
        <div className={clsx(
            'relative max-w-[90px] w-max px-2.5 py-1 rounded-[12px] border text-[10px] font-black uppercase tracking-tight flex items-center justify-center overflow-hidden',
            themeClass
        )}>
            {dynamicCanvas && (
                <div className="absolute inset-0 z-0 rounded-[12px] overflow-hidden">
                    <CanvasRenderer content={dynamicCanvas} />
                </div>
            )}
            <div className="relative z-10 truncate max-w-[80px]">
                {note.type === 'text'  && <span>{note.text}</span>}
                {note.type === 'music' && <span className="flex items-center gap-1"><PlayCircle size={9} />{note.track}</span>}
                {note.type === 'audio' && <span className="flex items-center gap-1"><Mic size={9} />Audio</span>}
            </div>
        </div>
    );
};

// ─── Story Ring (Instagram-style) ────────────────────────────────────────────
const StoryRing: React.FC<{
    user: any; hasNote: boolean; isMe?: boolean;
    onClick: () => void; inventory: any[]; note?: Note | null;
}> = ({ user, hasNote, isMe, onClick, inventory, note }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 shrink-0 group">
        <div className="relative">
            <div className={clsx(
                'p-[2px] rounded-[20px] transition-transform duration-200 group-hover:scale-105',
                hasNote
                    ? 'bg-gradient-to-tr from-sky-400 via-primary to-violet-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                    : 'bg-white/10'
            )}>
                <div className="bg-[#0c0c10] p-0.5 rounded-[18px]">
                    <UserAvatar user={user} size="w-14 h-14" className="rounded-[16px]" />
                </div>
            </div>
            {hasNote && note && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <NoteBubble note={note} inventory={inventory} />
                </div>
            )}
            {isMe && !hasNote && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white text-black rounded-lg flex items-center justify-center border-2 border-[#0c0c10] shadow z-10">
                    <Plus size={11} strokeWidth={3} />
                </div>
            )}
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 truncate w-16 text-center">
            {isMe ? 'Tú' : user?.name?.split(' ')[0]}
        </span>
    </button>
);

// ─── Note Creator Panel ───────────────────────────────────────────────────────
const NoteCreatorPanel: React.FC<{
    onClose: () => void; onSave: (n: Note) => void; inventory: any[];
}> = ({ onClose, onSave, inventory }) => {
    const [mode, setMode] = useState<'pick' | 'text' | 'audio' | 'music'>('pick');
    const [theme, setTheme] = useState<NoteTheme>('default');
    const [text, setText] = useState('');
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [audioPreview, setAudioPreview] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const recRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<any>(null);

    useEffect(() => {
        if (mode !== 'music' || !query.trim()) { setResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`);
                const d = await res.json();
                setResults(d.results || []);
            } catch {}
        }, 300);
        return () => clearTimeout(t);
    }, [query, mode]);

    useEffect(() => () => clearInterval(timerRef.current), []);

    const startRec = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            chunksRef.current = [];
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => setAudioPreview(reader.result as string);
                reader.readAsDataURL(blob);
            };
            mr.start(); recRef.current = mr;
            setRecording(true); setSeconds(0);
            timerRef.current = setInterval(() => setSeconds(s => {
                if (s >= 29) { stopRec(); return 30; }
                return s + 1;
            }), 1000);
        } catch { alert('Micrófono denegado'); }
    };
    const stopRec = () => { recRef.current?.stop(); clearInterval(timerRef.current); setRecording(false); };

    return (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                onClick={e => e.stopPropagation()}
                className={clsx(
                    'relative w-full sm:w-[360px] rounded-t-[32px] sm:rounded-[32px] border overflow-hidden shadow-2xl',
                    getThemeClass(theme, inventory)
                )}
            >
                {inventory.find(i => i.id === theme)?.css_content && (
                    <div className="absolute inset-0 z-0">
                        <CanvasRenderer content={inventory.find(i => i.id === theme).css_content} />
                    </div>
                )}
                <div className="relative z-10 p-5">
                    {/* Handle */}
                    <div className="flex justify-center mb-4 sm:hidden">
                        <div className="w-8 h-1 bg-white/20 rounded-full" />
                    </div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <button onClick={() => mode !== 'pick' ? setMode('pick') : onClose()}
                            className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">
                            {mode === 'pick' ? 'Cancelar' : '← Volver'}
                        </button>
                        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors opacity-50">
                            <X size={15} />
                        </button>
                    </div>

                    {mode === 'pick' && (
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            {[
                                { id: 'text' as const, icon: Edit3, label: 'Texto' },
                                { id: 'music' as const, icon: Music2, label: 'Música' },
                                { id: 'audio' as const, icon: Mic, label: 'Audio' },
                            ].map(m => (
                                <button key={m.id} onClick={() => setMode(m.id)}
                                    className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all aspect-square gap-2">
                                    <m.icon size={22} className="opacity-80" />
                                    <span className="text-xs font-semibold">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {mode === 'text' && (
                        <div className="space-y-4 mb-5">
                            <textarea autoFocus maxLength={60} value={text} onChange={e => setText(e.target.value)}
                                placeholder="¿Qué estás escuchando?"
                                className="w-full h-24 bg-transparent border-none text-xl placeholder:opacity-30 resize-none outline-none font-bold text-center" />
                            <div className="text-right text-[10px] opacity-30">{text.length}/60</div>
                            <button disabled={!text.trim()}
                                onClick={() => onSave({ type: 'text', text: text.trim(), savedAt: Date.now(), theme })}
                                className="w-full py-3.5 bg-white/20 hover:bg-white/30 font-bold rounded-2xl disabled:opacity-20 transition-all">
                                Compartir
                            </button>
                        </div>
                    )}

                    {mode === 'audio' && (
                        <div className="text-center mb-5">
                            {!audioPreview ? (
                                <>
                                    <div className="text-4xl font-black mb-5">{recording ? `${seconds}s` : '0s'}</div>
                                    <button onClick={recording ? stopRec : startRec}
                                        className={clsx('w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all mb-4 shadow-xl',
                                            recording ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'
                                        )}>
                                        {recording ? <div className="w-5 h-5 bg-white rounded-sm" /> : <Mic size={24} />}
                                    </button>
                                    <p className="text-xs opacity-50">{recording ? 'Grabando...' : 'Toca para grabar (máx 30s)'}</p>
                                </>
                            ) : (
                                <>
                                    <MiniAudioPlayer src={audioPreview} />
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => setAudioPreview(null)}
                                            className="flex-1 py-3 bg-white/10 rounded-2xl text-sm font-semibold hover:bg-white/20 transition-colors">
                                            Rehacer
                                        </button>
                                        <button onClick={() => onSave({ type: 'audio', audioB64: audioPreview, savedAt: Date.now(), theme })}
                                            className="flex-1 py-3 bg-white text-black rounded-2xl text-sm font-black shadow-lg transition-all hover:bg-white/90">
                                            Compartir
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {mode === 'music' && (
                        <div className="space-y-3 mb-5">
                            <div className="relative">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
                                <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                                    placeholder="Buscar canción..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm placeholder:opacity-40 outline-none focus:border-white/30 transition-colors" />
                            </div>
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
                                {results.map(s => (
                                    <button key={s.trackId}
                                        onClick={() => onSave({ type: 'music', track: s.trackName, artist: s.artistName, cover: s.artworkUrl100, previewUrl: s.previewUrl, savedAt: Date.now(), theme })}
                                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-left">
                                        <img src={s.artworkUrl100} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{s.trackName}</p>
                                            <p className="text-[11px] opacity-50 truncate">{s.artistName}</p>
                                        </div>
                                    </button>
                                ))}
                                {query.trim() && results.length === 0 && (
                                    <p className="text-center py-8 text-xs opacity-30 uppercase tracking-widest">Sin resultados</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Theme selector */}
                    <div className="space-y-2">
                        <p className="text-[9px] font-black opacity-20 uppercase tracking-[0.2em]">Diseño</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            {NOTE_THEMES.map(t => (
                                <button key={t.id} onClick={() => setTheme(t.id)}
                                    className={clsx('w-7 h-7 rounded-full shrink-0 border-2 transition-all', t.class,
                                        theme === t.id ? 'scale-110 border-white shadow-md' : 'scale-90 border-transparent opacity-50 hover:opacity-100'
                                    )} title={t.label} />
                            ))}
                            {inventory.map(item => (
                                <button key={item.id} onClick={() => setTheme(item.id)}
                                    className={clsx('w-7 h-7 rounded-full shrink-0 border overflow-hidden transition-all',
                                        theme === item.id ? 'scale-110 border-white' : 'scale-90 border-white/10 opacity-50 hover:opacity-100'
                                    )}>
                                    <CanvasRenderer content={item.css_content} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ─── Friend Row (Discord-style) ───────────────────────────────────────────────
const FriendRow: React.FC<{
    friend: SocialUser;
    onChat: (f: SocialUser) => void;
    onProfile: (f: SocialUser) => void;
    onRemove: (id: string) => void;
}> = ({ friend, onChat, onProfile, onRemove }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

    useEffect(() => {
        const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const openMenu = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            // Position above the button, aligned to the right
            setMenuPos({
                top: rect.top - 8, // will use transform to go upward
                right: window.innerWidth - rect.right,
            });
        }
        setMenuOpen(!menuOpen);
    };

    return (
        <div className="group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-white/[0.03] rounded-2xl transition-all border border-transparent hover:border-white/[0.04]">
            {/* Avatar + status */}
            <button onClick={() => onChat(friend)} className="relative shrink-0">
                <UserAvatar user={friend} size="w-12 h-12 sm:w-13 sm:h-13" className="rounded-2xl" />
                <StatusDot status={friend.status} />
                {friend.is_pinned && (
                    <div className="absolute -top-1 -left-1 bg-primary text-black rounded-md p-0.5 shadow-lg">
                        <Pin size={9} />
                    </div>
                )}
            </button>

            {/* Info */}
            <button onClick={() => onChat(friend)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white/90 truncate">{friend.name}</span>
                    {friend.unreadCount && friend.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary text-black text-[9px] font-black shrink-0">
                            {friend.unreadCount}
                        </span>
                    )}
                </div>
                {friend.activity?.track ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <MusicBars />
                        <span className="text-[11px] text-primary/70 font-medium truncate italic">{friend.activity.track}</span>
                    </div>
                ) : (
                    <span className="text-[11px] text-white/20 uppercase tracking-wider font-bold">
                        {friend.status === 'online' ? 'Disponible' : friend.status === 'idle' ? 'Inactivo' : 'Desconectado'}
                    </span>
                )}
            </button>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button onClick={() => onChat(friend)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all">
                    <MessageSquare size={16} />
                </button>
                <div className="relative" ref={menuRef}>
                    <button ref={btnRef} onClick={openMenu}
                        className={clsx('p-2.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all', menuOpen && 'bg-white/10 text-white')}>
                        <MoreHorizontal size={16} />
                    </button>
                    <AnimatePresence>
                        {menuOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.92, y: 4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.92, y: 4 }}
                                style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, transform: 'translateY(-100%)' }}
                                className="w-52 bg-[#141416]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[500]"
                            >
                                <button onClick={() => { onProfile(friend); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                                    <UserCircle size={16} /> Ver perfil
                                </button>
                                <button onClick={async () => { await socialService.togglePin(friend.id); setMenuOpen(false); window.dispatchEvent(new CustomEvent('svzn_friends_updated')); }}
                                    className={clsx('w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors',
                                        friend.is_pinned ? 'text-primary bg-primary/5' : 'text-white/70 hover:text-white hover:bg-white/5'
                                    )}>
                                    <Pin size={16} className={clsx(friend.is_pinned && 'fill-primary')} />
                                    {friend.is_pinned ? 'Desfijar' : 'Fijar arriba'}
                                </button>
                                <button onClick={async () => { await socialService.toggleMute(friend.id); setMenuOpen(false); window.dispatchEvent(new CustomEvent('svzn_friends_updated')); }}
                                    className={clsx('w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors',
                                        friend.is_muted ? 'text-amber-400 bg-amber-400/5' : 'text-white/70 hover:text-white hover:bg-white/5'
                                    )}>
                                    <VolumeX size={16} /> {friend.is_muted ? 'Activar notifs' : 'Silenciar'}
                                </button>
                                <div className="h-px bg-white/5 my-1" />
                                <button onClick={() => { if (confirm(`¿Eliminar a ${friend.name}?`)) onRemove(friend.id); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors">
                                    <Trash2 size={16} /> Eliminar amigo
                                </button>
                                <button onClick={async () => { if (confirm(`¿Bloquear a ${friend.name}?`)) { await socialService.blockUser(friend.id); window.dispatchEvent(new CustomEvent('svzn_friends_updated')); } setMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors">
                                    <ShieldAlert size={16} /> Bloquear
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

// ─── Chat Panel ───────────────────────────────────────────────────────────────
const ChatPanel: React.FC<{ friend: SocialUser; onClose: () => void }> = ({ friend, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [musicFilter, setMusicFilter] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuth();
    const { currentTrack, addToast, toggleFavorite, addToQueue } = usePlayerStore();

    const loadMessages = useCallback(async () => {
        const data = await socialService.getChat(friend.id);
        setMessages(data);
    }, [friend.id]);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [loadMessages]);

    useEffect(() => {
        if (scrollRef.current) {
            requestAnimationFrame(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            });
        }
    }, [messages]);

    const handleSend = async (type: 'text' | 'music' = 'text', content?: string, trackData?: any) => {
        const finalContent = content || text;
        if (!finalContent.trim() && type === 'text') return;
        const ok = await socialService.sendMessage(friend.id, type, finalContent, trackData);
        if (ok) {
            setText('');
            loadMessages();
        }
    };

    const shareCurrentTrack = () => {
        if (!currentTrack) return;
        handleSend('music', `¡Escucha esto! ${currentTrack.title}`, {
            track: currentTrack.title, artist: currentTrack.artist,
            cover: typeof currentTrack.artwork === 'string' ? currentTrack.artwork : '',
            previewUrl: (currentTrack as any).previewUrl || ''
        });
    };

    const displayed = musicFilter ? messages.filter(m => m.type === 'music') : messages;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col h-full overflow-hidden bg-[#08080a]"
        >
            {/* ── Chat Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] bg-black/30 shrink-0">
                <button onClick={onClose} className="p-2 -ml-1 text-white/40 hover:text-white transition-colors sm:hidden">
                    <ChevronLeft size={20} />
                </button>
                <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'profile', params: { userId: friend.id } } }))}
                    className="relative shrink-0">
                    <UserAvatar user={friend} size="w-10 h-10" className="rounded-xl" />
                    <StatusDot status={friend.status} />
                </button>
                <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'profile', params: { userId: friend.id } } }))}
                    className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-white/90 truncate">{friend.name}</p>
                    <div className="flex items-center gap-1.5">
                        {friend.activity?.track ? (
                            <>
                                <MusicBars />
                                <span className="text-[10px] text-primary/70 truncate italic">{friend.activity.track}</span>
                            </>
                        ) : (
                            <span className={clsx('text-[10px] font-bold uppercase tracking-wider',
                                friend.status === 'online' ? 'text-emerald-400/70' : 'text-white/20'
                            )}>
                                {friend.status === 'online' ? 'En línea' : 'Desconectado'}
                            </span>
                        )}
                    </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                    {currentTrack && (
                        <button onClick={shareCurrentTrack} title="Compartir canción actual"
                            className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                            <Music2 size={16} />
                        </button>
                    )}
                    <div className="relative">
                        <button onClick={() => setMenuOpen(!menuOpen)}
                            className={clsx('p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-xl transition-all', menuOpen && 'bg-white/10 text-white')}>
                            <Settings size={16} />
                        </button>
                        <AnimatePresence>
                            {menuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 6 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 6 }}
                                    className="absolute right-0 mt-2 w-56 bg-[#141416]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50"
                                >
                                    <button onClick={() => { setMusicFilter(!musicFilter); setMenuOpen(false); }}
                                        className={clsx('w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors',
                                            musicFilter ? 'text-primary bg-primary/5' : 'text-white/70 hover:text-white hover:bg-white/5'
                                        )}>
                                        <Music2 size={15} /> {musicFilter ? 'Ver todos' : 'Solo música'}
                                    </button>
                                    <button onClick={async () => { if (confirm('¿Vaciar conversación?')) { await socialService.clearChat(friend.id); loadMessages(); setMenuOpen(false); } }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-colors">
                                        <Trash2 size={15} /> Vaciar chat
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* ── Now Playing Banner ── */}
            {friend.activity?.track && (
                <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 flex items-center gap-3 shrink-0">
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/5 shrink-0">
                        {friend.activity.cover
                            ? <img src={friend.activity.cover} className="w-full h-full object-cover" />
                            : <Music2 size={12} className="m-1.5 opacity-20" />
                        }
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Escuchando ahora</p>
                        <p className="text-xs font-bold text-white/80 truncate">{friend.activity.track} — {friend.activity.artist}</p>
                    </div>
                    {friend.activity.duration && friend.activity.progress !== undefined && (
                        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-primary rounded-full"
                                style={{ width: `${(friend.activity.progress / friend.activity.duration) * 100}%` }} />
                        </div>
                    )}
                </div>
            )}

            {/* ── Messages ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
                {displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-10 pb-20">
                        <MessageSquare size={36} className="mb-3" />
                        <p className="text-xs font-black tracking-widest uppercase">
                            {musicFilter ? 'Sin música compartida' : 'Sin mensajes aún'}
                        </p>
                    </div>
                ) : displayed.map((m, i) => {
                    const isMe = m.sender_id === user?.id;
                    const showAvatar = !isMe && (i === 0 || displayed[i - 1]?.sender_id !== m.sender_id);
                    return (
                        <div key={m.id} className={clsx('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                            {!isMe && (
                                <div className="shrink-0 mb-0.5 w-7">
                                    {showAvatar
                                        ? <button onClick={() => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'profile', params: { userId: friend.id } } }))}>
                                            <UserAvatar user={friend} size="w-7 h-7" className="rounded-lg" />
                                          </button>
                                        : null
                                    }
                                </div>
                            )}
                            <div className={clsx('max-w-[78%] group', isMe ? 'items-end' : 'items-start')}>
                                <div className={clsx(
                                    'px-3.5 py-2 rounded-[18px] text-[13px] leading-snug shadow-sm',
                                    isMe
                                        ? 'bg-primary text-black rounded-br-[4px]'
                                        : 'bg-white/[0.07] text-white/90 rounded-bl-[4px] border border-white/[0.04]'
                                )}>
                                    {m.type === 'music' && m.track_data ? (
                                        <div className="py-0.5">
                                            <div className="flex items-center gap-3 bg-black/20 p-2.5 rounded-xl border border-white/5 mb-1.5 group/music">
                                                <img src={m.track_data.cover} className="w-11 h-11 rounded-lg object-cover shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                                    onClick={() => usePlayerStore.getState().playUnifiedTrack({
                                                        title: m.track_data.track, artist: m.track_data.artist,
                                                        artwork: m.track_data.cover, previewUrl: m.track_data.previewUrl
                                                    })} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-black truncate cursor-pointer hover:text-primary transition-colors"
                                                        onClick={() => usePlayerStore.getState().playUnifiedTrack({
                                                            title: m.track_data.track, artist: m.track_data.artist,
                                                            artwork: m.track_data.cover
                                                        })}>
                                                        {m.track_data.track}
                                                    </p>
                                                    <p className="text-[10px] opacity-60 truncate font-bold uppercase">{m.track_data.artist}</p>
                                                </div>
                                                <div className="flex flex-col gap-1 opacity-0 group-hover/music:opacity-100 transition-opacity">
                                                    <button onClick={() => { addToQueue(m.track_data); addToast({ type: 'track', message: 'Añadido a la cola' }); }}
                                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Añadir a cola">
                                                        <ListMusic size={12} />
                                                    </button>
                                                    <button onClick={() => toggleFavorite(m.track_data)}
                                                        className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors" title="Favorito">
                                                        <Heart size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            {m.content && <p className="text-[11px] opacity-60 italic px-1">"{m.content}"</p>}
                                        </div>
                                    ) : (
                                        <p className="break-words">{m.content}</p>
                                    )}
                                </div>
                                <div className={clsx(
                                    'flex items-center gap-1.5 mt-1 px-1 text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-60 transition-opacity',
                                    isMe ? 'justify-end text-white/40' : 'justify-start text-white/20'
                                )}>
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isMe && (m.is_read ? <CheckCheck size={11} className="text-primary/60" /> : <Check size={11} />)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Input ── */}
            <div className="px-4 py-3 bg-gradient-to-t from-black/60 to-transparent shrink-0">
                <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-2xl pl-4 pr-2 py-1.5 focus-within:border-white/20 transition-all">
                    <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder={`Mensaje a ${friend.name.split(' ')[0]}...`}
                        className="flex-1 bg-transparent border-none outline-none text-[13px] text-white placeholder:text-white/20 py-1.5" />
                    <button onClick={() => handleSend()} disabled={!text.trim()}
                        className={clsx('p-2.5 rounded-xl transition-all active:scale-95',
                            text.trim() ? 'bg-primary text-black hover:bg-primary/90 shadow-lg' : 'bg-white/5 text-white/10 cursor-not-allowed'
                        )}>
                        <Send size={15} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

// ─── Main FriendsView ─────────────────────────────────────────────────────────
export const FriendsView: React.FC<{ initialChatId?: string }> = ({ initialChatId }) => {
    const { user } = useAuth();
    const [tab, setTab] = useState<'online' | 'all' | 'add' | 'requests'>('online');
    const [myNote, setMyNote] = useState<Note | null>(null);
    const [friends, setFriends] = useState<SocialUser[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chatFriend, setChatFriend] = useState<SocialUser | null>(null);
    const [noteCreatorOpen, setNoteCreatorOpen] = useState(false);
    const [selectedFriendNote, setSelectedFriendNote] = useState<SocialUser | null>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [addQuery, setAddQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SocialUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);
    const { addNotification } = useNotificationsStore();
    const prevUnreadRef = useRef<Record<string, number>>({});

    const loadFriends = useCallback(async () => {
        setIsLoading(true);
        const data = await socialService.getFriends();
        data.forEach(f => {
            const prev = prevUnreadRef.current[f.id] || 0;
            const curr = f.unreadCount || 0;
            if (curr > prev && !f.is_muted) {
                addNotification(`Nuevo mensaje de ${f.name}`,
                    f.activity?.track ? `🎵 ${f.activity.track}` : 'Toca para responder', 'music');
            }
            prevUnreadRef.current[f.id] = curr;
        });
        setFriends(data);
        setIsLoading(false);
    }, [addNotification]);

    useEffect(() => {
        const raw = localStorage.getItem(MY_NOTE_KEY);
        if (raw) { try { const n = JSON.parse(raw); if (isNoteActive(n)) setMyNote(n); } catch {} }
        loadFriends();
        socialService.getRequests().then(setPendingRequests);
        socialService.getUserInventory().then(setInventory);
        setInviteLink(socialService.generateInviteLink(user));
        const h = () => loadFriends();
        window.addEventListener('svzn_friends_updated', h);
        const poll = setInterval(loadFriends, 10000);
        return () => { window.removeEventListener('svzn_friends_updated', h); clearInterval(poll); };
    }, [loadFriends, user]);

    useEffect(() => {
        if (tab === 'requests') socialService.getRequests().then(setPendingRequests);
    }, [tab]);

    useEffect(() => {
        if (initialChatId && friends.length > 0) {
            const f = friends.find(fr => fr.id === initialChatId);
            if (f) setChatFriend(f);
        }
    }, [initialChatId, friends]);

    useEffect(() => {
        if (!addQuery.trim() || tab !== 'add') { setSearchResults([]); return; }
        const t = setTimeout(async () => {
            setIsSearching(true);
            const r = await socialService.searchUsers(addQuery);
            setSearchResults(r);
            setIsSearching(false);
        }, 400);
        return () => clearTimeout(t);
    }, [addQuery, tab]);

    const saveNote = (note: Note) => {
        localStorage.setItem(MY_NOTE_KEY, JSON.stringify(note));
        setMyNote(note);
        setNoteCreatorOpen(false);
        socialService.saveNote(note).catch(() => {});
    };

    const deleteNote = () => {
        localStorage.removeItem(MY_NOTE_KEY);
        setMyNote(null);
        socialService.deleteNote().catch(() => {});
    };

    const handleRespondRequest = async (senderId: string, accept: boolean) => {
        const ok = await socialService.respondRequest(senderId, accept);
        if (ok) {
            setPendingRequests(p => p.filter(r => r.id !== senderId));
            if (accept) { await loadFriends(); setTab('all'); }
        }
    };

    const displayed = (tab === 'online' ? friends.filter(f => f.status !== 'offline') : friends)
        .sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return (b.unreadCount || 0) - (a.unreadCount || 0);
        });

    const onlineCount = friends.filter(f => f.status !== 'offline').length;

    return (
        <div className="flex h-full overflow-hidden bg-[#08080a]">
            <GlobalStyles />
            <AnimatePresence>
                {noteCreatorOpen && (
                    <NoteCreatorPanel onClose={() => setNoteCreatorOpen(false)} onSave={saveNote} inventory={inventory} />
                )}
            </AnimatePresence>

            {/* ── LEFT PANEL (friend list) — hidden on mobile when chat open ── */}
            <div className={clsx(
                'flex flex-col border-r border-white/[0.04] transition-all duration-300',
                chatFriend ? 'hidden sm:flex sm:w-[300px] lg:w-[340px]' : 'flex w-full sm:w-[300px] lg:w-[340px]'
            )}>
                {/* Header */}
                <div className="px-4 pt-4 pb-2 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-black text-white tracking-tight">Comunidad</h2>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-emerald-400/70 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                                {onlineCount} activos
                            </span>
                        </div>
                    </div>

                    {/* Stories row */}
                    <div className="flex gap-4 overflow-x-auto pb-3 custom-scrollbar -mx-1 px-1 pt-6">
                        <StoryRing
                            user={user} hasNote={!!(myNote && isNoteActive(myNote))}
                            isMe note={myNote} inventory={inventory}
                            onClick={() => myNote && isNoteActive(myNote) ? deleteNote() : setNoteCreatorOpen(true)}
                        />
                        {friends.filter(f => f.note && isNoteActive(f.note as Note)).map(f => (
                            <StoryRing key={f.id} user={f} hasNote note={f.note as Note} inventory={inventory}
                                onClick={() => setSelectedFriendNote(f)} />
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-2 bg-white/[0.03] p-1 rounded-xl">
                        {([
                            { id: 'online',   label: 'Activos' },
                            { id: 'all',      label: 'Todos' },
                            { id: 'requests', label: `Solicitudes${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}` },
                            { id: 'add',      label: 'Añadir' },
                        ] as const).map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={clsx('flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all truncate',
                                    tab === t.id ? 'bg-white text-black shadow' : 'text-white/30 hover:text-white/60'
                                )}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
                    {isLoading ? (
                        <div className="space-y-3 p-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-3 items-center animate-pulse">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-white/5 rounded w-1/3" />
                                        <div className="h-2 bg-white/5 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : tab === 'add' ? (
                        <div className="p-3 space-y-4">
                            <div className="relative">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                                <input value={addQuery} onChange={e => setAddQuery(e.target.value)}
                                    placeholder="Buscar por nombre o ID..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors" />
                                {isSearching && <Loader2 size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-white/20" />}
                            </div>
                            <AnimatePresence>
                                {searchResults.length > 0 && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                                        {searchResults.map(r => {
                                            const isReq = requestedIds.has(r.id) || r.friend_status === 'pending';
                                            const isFr = friends.some(f => f.id === r.id) || r.friend_status === 'accepted';
                                            return (
                                                <div key={r.id} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                                                    <UserAvatar user={r} size="w-10 h-10" className="rounded-xl" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white/90 truncate">{r.name}</p>
                                                        <p className="text-[10px] text-white/30">@{r.username || 'user'}</p>
                                                    </div>
                                                    <button
                                                        disabled={isReq || isFr}
                                                        onClick={async () => {
                                                            const ok = await socialService.sendFriendRequest(r.id);
                                                            if (ok) setRequestedIds(p => new Set(p).add(r.id));
                                                        }}
                                                        className={clsx('px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0',
                                                            isFr ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            isReq ? 'bg-white/5 text-white/20 border border-white/5' :
                                                            'bg-white text-black hover:scale-105 active:scale-95 shadow-lg'
                                                        )}>
                                                        {isFr ? 'Amigo' : isReq ? 'Enviado' : 'Conectar'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {/* Invite link */}
                            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Invitar amigos</p>
                                <button onClick={async () => { try { await navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }}
                                    className="w-full flex items-center justify-between bg-black/40 rounded-xl px-3 py-2.5 hover:bg-black/60 transition-colors group">
                                    <span className="text-xs text-primary/60 truncate pr-3">{inviteLink}</span>
                                    <span className={clsx('text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 transition-all',
                                        copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/60 group-hover:bg-white/20'
                                    )}>
                                        {copied ? '✓ Copiado' : 'Copiar'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    ) : tab === 'requests' ? (
                        <div className="p-3 space-y-2">
                            {pendingRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 opacity-20">
                                    <UserPlus size={32} className="mb-3" />
                                    <p className="text-sm font-medium">Sin solicitudes</p>
                                </div>
                            ) : pendingRequests.map(req => (
                                <div key={req.id} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                                    <UserAvatar user={req} size="w-11 h-11" className="rounded-xl" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white/90 truncate">{req.name}</p>
                                        <p className="text-[11px] text-white/30">@{req.username}</p>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button onClick={() => handleRespondRequest(req.id, true)}
                                            className="px-3 py-1.5 bg-primary text-black text-[11px] font-black rounded-xl hover:bg-primary/90 transition-all">
                                            Aceptar
                                        </button>
                                        <button onClick={() => handleRespondRequest(req.id, false)}
                                            className="px-3 py-1.5 bg-white/10 text-white/60 text-[11px] font-bold rounded-xl hover:bg-white/20 transition-all">
                                            No
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-0.5 pt-1">
                            {displayed.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 opacity-20">
                                    <Users size={32} className="mb-3" />
                                    <p className="text-sm font-medium">
                                        {tab === 'online' ? 'Nadie activo ahora' : 'Sin amigos aún'}
                                    </p>
                                </div>
                            ) : displayed.map(f => (
                                <FriendRow key={f.id} friend={f}
                                    onChat={setChatFriend}
                                    onProfile={f => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { view: 'profile', params: { userId: f.id } } }))}
                                    onRemove={async id => { await socialService.removeFriend(id); loadFriends(); }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL (chat or empty state) ── */}
            <div className={clsx(
                'flex-1 flex flex-col overflow-hidden',
                // En móvil: solo mostrar si hay chat abierto (ocupa toda la pantalla)
                chatFriend ? 'flex' : 'hidden sm:flex'
            )}>
                <AnimatePresence mode="wait">
                    {chatFriend ? (
                        <ChatPanel key={chatFriend.id} friend={chatFriend} onClose={() => setChatFriend(null)} />
                    ) : (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col items-center justify-center gap-4 opacity-10">
                            <MessageSquare size={48} />
                            <div className="text-center">
                                <p className="text-sm font-black uppercase tracking-widest">Selecciona un amigo</p>
                                <p className="text-xs mt-1">para empezar a chatear</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Note viewer modal ── */}
            <AnimatePresence>
                {selectedFriendNote?.note && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setSelectedFriendNote(null)}>
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            className={clsx('relative w-full max-w-sm rounded-3xl border overflow-hidden shadow-2xl', getThemeClass(selectedFriendNote.note.theme, inventory))}
                        >
                            {inventory.find(i => i.id === selectedFriendNote.note?.theme)?.css_content && (
                                <div className="absolute inset-0 z-0">
                                    <CanvasRenderer content={inventory.find(i => i.id === selectedFriendNote.note?.theme).css_content} />
                                </div>
                            )}
                            <div className="relative z-10 p-6">
                                <button onClick={() => setSelectedFriendNote(null)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors opacity-60">
                                    <X size={16} />
                                </button>
                                <div className="flex flex-col items-center text-center mb-5">
                                    <UserAvatar user={selectedFriendNote} size="w-14 h-14" className="rounded-2xl mb-3" />
                                    <p className="font-bold text-sm">{selectedFriendNote.name}</p>
                                    <p className="text-[10px] opacity-40 mt-0.5">{formatTime(selectedFriendNote.note.savedAt)}</p>
                                </div>
                                {selectedFriendNote.note.type === 'text' && (
                                    <div className="bg-black/20 rounded-2xl p-5 text-center">
                                        <p className="text-lg font-bold italic">"{selectedFriendNote.note.text}"</p>
                                    </div>
                                )}
                                {selectedFriendNote.note.type === 'music' && (
                                    <div className="bg-black/20 rounded-2xl p-4 text-center">
                                        <img src={selectedFriendNote.note.cover} className="w-24 h-24 mx-auto rounded-xl shadow-lg mb-3 object-cover" alt="" />
                                        <p className="font-bold truncate">{selectedFriendNote.note.track}</p>
                                        <p className="text-sm opacity-50 truncate mb-3">{selectedFriendNote.note.artist}</p>
                                        {selectedFriendNote.note.previewUrl && <MiniAudioPlayer src={selectedFriendNote.note.previewUrl} />}
                                    </div>
                                )}
                                {selectedFriendNote.note.type === 'audio' && selectedFriendNote.note.audioB64 && (
                                    <div className="bg-black/20 rounded-2xl p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 text-center mb-3 flex items-center justify-center gap-1.5">
                                            <Mic size={12} /> Nota de voz
                                        </p>
                                        <MiniAudioPlayer src={selectedFriendNote.note.audioB64} />
                                    </div>
                                )}
                                <button onClick={() => { setChatFriend(selectedFriendNote); setSelectedFriendNote(null); }}
                                    className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                                    <MessageSquare size={15} /> Responder
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
