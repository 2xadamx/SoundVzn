import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Smile, Paperclip } from 'lucide-react';
import { socketManager } from '../../utils/socket';

interface ChatOverlayProps {
    friend: any;
    onClose: () => void;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ friend, onClose }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleSend = () => {
        if (!message.trim()) return;
        
        socketManager.sendChat(friend.id, message);
        setMessages(prev => [...prev, { sender_id: 'me', content: message, created_at: Date.now() }]);
        setMessage('');
    };

    useEffect(() => {
        const handleReceive = (e: any) => {
            const data = e.detail;
            if (data.sender_id === friend.id) {
                setMessages(prev => [...prev, data]);
            }
        };

        window.addEventListener('svzn:chat_receive', handleReceive);
        return () => window.removeEventListener('svzn:chat_receive', handleReceive);
    }, [friend.id]);

    useEffect(() => {
        scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    }, [messages]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-8 w-96 h-[500px] bg-[#0a0a0c]/90 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl z-[100] flex flex-col overflow-hidden"
        >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold">
                        {friend.name?.[0]}
                    </div>
                    <div>
                        <h3 className="font-bold text-white leading-tight">{friend.name}</h3>
                        <span className="text-xs text-green-400">En línea</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-5 h-5 text-white/50" />
                </button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {messages.map((msg, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: msg.sender_id === 'me' ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex ${msg.sender_id === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                            msg.sender_id === 'me' 
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
                            : 'bg-white/10 text-white/90 rounded-tl-none border border-white/5'
                        }`}>
                            {msg.content}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white/5 border-t border-white/5">
                <div className="relative flex items-center gap-2 bg-[#121214] border border-white/10 rounded-2xl p-2 px-4 focus-within:border-indigo-500/50 transition-all">
                    <input 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Escribe un mensaje..."
                        className="bg-transparent border-none outline-none text-white text-sm flex-1 py-2"
                    />
                    <div className="flex items-center gap-1">
                        <button className="p-2 text-white/30 hover:text-white/60 transition-colors">
                            <Smile className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={handleSend}
                            className="p-2 bg-indigo-600 rounded-xl text-white hover:bg-indigo-500 transition-all active:scale-90"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
