import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import clsx from 'clsx';

export const VoiceNoteRecorder: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [savedNote, setSavedNote] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('svzn_voice_note');
        if (stored) setSavedNote(stored);
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            
            mediaRecorder.current.onstop = () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    setSavedNote(base64data);
                    localStorage.setItem('svzn_voice_note', base64data);
                    notificationService.success('Nota de voz guardada');
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            // 30 seconds limit
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 29) { stopRecording(); return 30; }
                    return prev + 1;
                });
            }, 1000);
        } catch (error) {
            notificationService.error('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(() => notificationService.error('Error reprod.'));
        }
        setIsPlaying(!isPlaying);
    };

    const deleteNote = () => {
        setSavedNote(null);
        localStorage.removeItem('svzn_voice_note');
        setIsPlaying(false);
        setRecordingTime(0);
    };

    return (
        <div className="bg-black/20 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
            <h3 className="text-xs font-black tracking-widest text-white/40 uppercase mb-4">Update de Estado (Audio)</h3>
            
            {!savedNote ? (
                <div className="flex flex-col items-center justify-center p-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={isRecording ? stopRecording : startRecording}
                        className={clsx(
                            "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300",
                            isRecording 
                                ? "bg-red-500 text-white animate-pulse" 
                                : "bg-white/10 text-white hover:bg-white/20"
                        )}
                    >
                        {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
                    </motion.button>
                    <p className="mt-4 text-[10px] font-bold text-white/40 tracking-widest uppercase">
                        {isRecording ? `Grabando... ${recordingTime}s / 30s` : 'Mantén para grabar 30s'}
                    </p>
                </div>
            ) : (
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <button 
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:bg-primary-400 transition-colors"
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                    </button>
                    
                    <div className="flex-1">
                        {/* Visualizer Mock */}
                        <div className="flex items-center gap-1 h-6">
                            {[...Array(20)].map((_, i) => (
                                <motion.div 
                                    key={i}
                                    animate={{ height: isPlaying ? Math.random() * 24 + 4 : 4 }}
                                    transition={{ duration: 0.2, repeat: isPlaying ? Infinity : 0 }}
                                    className="flex-1 bg-white/20 rounded-full"
                                />
                            ))}
                        </div>
                    </div>
                    
                    <button onClick={deleteNote} className="p-2 text-white/30 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                    </button>

                    <audio 
                        ref={audioRef} 
                        src={savedNote} 
                        onEnded={() => setIsPlaying(false)} 
                        className="hidden"
                    />
                </div>
            )}
        </div>
    );
};
