import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Code, Play, 
    CheckCircle2, Rocket, Palette, Sparkles, Layout, Monitor, Smartphone, Terminal
} from 'lucide-react';
import { socialService } from '../../utils/socialService';
import { CanvasRenderer } from '../common/CanvasRenderer';
import clsx from 'clsx';

interface CanvasStudioProps {
    onClose: () => void;
}

const TEMPLATES = {
    minimal: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .shape { width: 100px; height: 100px; border: 2px solid #5865F2; animation: spin 4s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  </style>
</head>
<body><div class="shape"></div></body>
</html>`,
    aurora: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #050505; height: 100vh; overflow: hidden; margin: 0; }
    .aurora { 
        position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
        background: radial-gradient(circle at center, #5865F2 0%, transparent 50%),
                    radial-gradient(circle at 30% 30%, #00d4ff 0%, transparent 40%);
        filter: blur(80px); animation: move 20s infinite linear;
    }
    @keyframes move { 
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body><div class="aurora"></div></body>
</html>`,
    cyber: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #000; color: #0ff; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .grid { 
        position: absolute; width: 200%; height: 200%; 
        background-image: linear-gradient(#0ff1 1px, transparent 1px), linear-gradient(90deg, #0ff1 1px, transparent 1px);
        background-size: 40px 40px; transform: perspective(500px) rotateX(60deg);
        animation: slide 2s linear infinite;
    }
    @keyframes slide { from { transform: perspective(500px) rotateX(60deg) translateY(0); } to { transform: perspective(500px) rotateX(60deg) translateY(40px); } }
  </style>
</head>
<body><div class="grid"></div><h1>SOUNDVZN_CORE</h1></body>
</html>`
};

export const CanvasStudio: React.FC<CanvasStudioProps> = ({ onClose }) => {
    const [content, setContent] = useState(TEMPLATES.minimal);

    const [metadata, setMetadata] = useState({
        name: '',
        description: '',
        price: 50,
        category: 'Animated'
    });

    const [tab, setTab] = useState<'editor' | 'details'>('editor');
    const [previewSize, setPreviewSize] = useState<'mobile' | 'desktop'>('mobile');
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handlePublish = async () => {
        if (!metadata.name || !metadata.description) {
            alert('Nombre y descripción obligatorios.');
            return;
        }

        setIsPublishing(true);
        try {
            const res = await socialService.publishTheme({
                ...metadata,
                css_content: content
            });

            if (res.success) {
                setPublishStatus('success');
                setTimeout(() => onClose(), 2000);
            } else {
                setPublishStatus('error');
            }
        } catch {
            setPublishStatus('error');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-8 bg-[#020204]/98 backdrop-blur-3xl">
            <motion.div 
                initial={{ opacity: 0, scale: 0.995 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full max-w-7xl bg-[#050505] border border-white/5 rounded-none md:rounded-[44px] shadow-[0_60px_150px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col"
            >
                {/* STUDIO HEADER */}
                <div className="flex items-center justify-between px-12 py-8 border-b border-white/[0.03] bg-white/[0.005]">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <h2 className="text-[11px] font-black tracking-[0.4em] uppercase text-white/90 flex items-center gap-4">
                                <Terminal size={14} className="text-sky-400" />
                                SOUNDVZN STUDIO PRO
                                <span className="text-[8px] bg-white text-black px-2 py-0.5 rounded-sm tracking-widest font-black">BETA</span>
                            </h2>
                            <div className="flex items-center gap-3 mt-1.5 ml-7">
                                <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">CORE // SVZN-v2</p>
                                <span className="w-1 h-1 rounded-full bg-emerald-500/40" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/[0.02] p-1.5 rounded-[22px] border border-white/[0.04]">
                        <button 
                            onClick={() => setTab('editor')}
                            className={clsx(
                                "px-8 py-3 rounded-[16px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2.5", 
                                tab === 'editor' ? "bg-white text-black shadow-2xl" : "text-white/20 hover:text-white/40"
                            )}
                        >
                            <Code size={14} strokeWidth={3} /> Editor
                        </button>
                        <button 
                            onClick={() => setTab('details')}
                            className={clsx(
                                "px-8 py-3 rounded-[16px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2.5", 
                                tab === 'details' ? "bg-white text-black shadow-2xl" : "text-white/20 hover:text-white/40"
                            )}
                        >
                            <Layout size={14} strokeWidth={3} /> Config
                        </button>
                        
                        <div className="w-[1px] h-6 bg-white/5 mx-3" />
                        
                        <button 
                            onClick={onClose}
                            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors text-white/20 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT PANEL: EDITOR OR DETAILS */}
                    <div className="w-full lg:w-7/12 flex flex-col border-r border-white/[0.03]">
                        <AnimatePresence mode="wait">
                            {tab === 'editor' ? (
                                <motion.div 
                                    key="editor"
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    exit={{ opacity: 0, x: 10 }}
                                    className="flex-1 flex flex-col"
                                >
                                    <div className="px-12 py-5 bg-black/10 flex items-center justify-between border-b border-white/[0.015]">
                                        <div className="flex gap-4">
                                            {Object.keys(TEMPLATES).map(t => (
                                                <button 
                                                    key={t}
                                                    onClick={() => setContent((TEMPLATES as any)[t])}
                                                    className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                                                >
                                                    [{t}]
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Compiler: Active</span>
                                        </div>
                                    </div>
                                    <textarea 
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        spellCheck={false}
                                        className="flex-1 bg-transparent p-12 font-mono text-[14px] text-white/70 outline-none resize-none custom-scrollbar leading-relaxed selection:bg-white/10 focus:text-white transition-colors"
                                    />
                                    <div className="px-12 py-5 bg-white/[0.005] border-t border-white/[0.015] flex items-center gap-4">
                                        <Terminal size={12} className="text-sky-500/40" />
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/10">Full HTML5/JS ES6+ Compatibility</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="details"
                                    initial={{ opacity: 0, x: 10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex-1 p-12 space-y-12 overflow-y-auto custom-scrollbar"
                                >
                                    <div className="grid grid-cols-1 gap-12 max-w-xl">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-1">Asset Identity</label>
                                            <input 
                                                value={metadata.name}
                                                onChange={e => setMetadata({...metadata, name: e.target.value})}
                                                placeholder="Nombre del Canvas"
                                                className="w-full bg-white/[0.02] border border-white/[0.05] rounded-[22px] px-8 py-5 text-sm text-white focus:bg-white/[0.04] focus:border-white/20 outline-none transition-all placeholder:text-white/5 font-bold"
                                            />
                                            <p className="text-[10px] text-white/5 font-bold ml-6">Visible en el Marketplace para la comunidad.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-1">Documentation</label>
                                            <textarea 
                                                value={metadata.description}
                                                onChange={e => setMetadata({...metadata, description: e.target.value})}
                                                placeholder="Breve descripción técnica..."
                                                className="w-full h-40 bg-white/[0.02] border border-white/[0.05] rounded-[22px] px-8 py-6 text-sm text-white focus:bg-white/[0.04] focus:border-white/20 outline-none transition-all resize-none placeholder:text-white/5 font-medium leading-relaxed"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-1">Price (SC)</label>
                                                <input 
                                                    type="number"
                                                    value={metadata.price}
                                                    onChange={e => setMetadata({...metadata, price: parseInt(e.target.value)})}
                                                    className="w-full bg-white/[0.02] border border-white/[0.05] rounded-[22px] px-8 py-5 text-sm font-black text-white focus:border-white/20 outline-none text-center"
                                                />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-1">Category Tags</label>
                                                <div className="relative">
                                                    <select 
                                                        value={metadata.category}
                                                        onChange={e => setMetadata({...metadata, category: e.target.value})}
                                                        className="w-full bg-white/[0.02] border border-white/[0.05] rounded-[22px] px-8 py-5 text-sm text-white outline-none appearance-none font-bold focus:border-white/20 cursor-pointer"
                                                    >
                                                        <option value="Animated">Animated</option>
                                                        <option value="Minimal">Minimal</option>
                                                        <option value="Gradient">Gradient</option>
                                                        <option value="Interactive">Interactive</option>
                                                    </select>
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                                        <Layout size={14} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RIGHT PANEL: PREVIEW */}
                    <div className="hidden lg:flex flex-1 bg-[#030303] flex-col items-center justify-center p-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-sky-500/[0.02] to-transparent pointer-events-none" />
                        
                        <div className="absolute top-10 flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] p-1.5 rounded-2xl z-20 shadow-2xl">
                            <button 
                                onClick={() => setPreviewSize('mobile')}
                                className={clsx("p-3 rounded-xl transition-all", previewSize === 'mobile' ? "bg-white text-black shadow-lg scale-105" : "text-white/20 hover:text-white/40")}
                            >
                                <Smartphone size={18} />
                            </button>
                            <button 
                                onClick={() => setPreviewSize('desktop')}
                                className={clsx("p-3 rounded-xl transition-all", previewSize === 'desktop' ? "bg-white text-black shadow-lg scale-105" : "text-white/20 hover:text-white/40")}
                            >
                                <Monitor size={18} />
                            </button>
                        </div>

                        <div className={clsx(
                            "transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[0_80px_160px_rgba(0,0,0,0.9)] border border-white/[0.05] overflow-hidden bg-black relative",
                            previewSize === 'mobile' ? "w-[320px] h-[640px] rounded-[56px] p-2.5" : "w-full max-w-[90%] aspect-video rounded-[32px] p-2"
                        )}>
                            <div className="w-full h-full relative rounded-[inherit] overflow-hidden">
                                <CanvasRenderer content={content} />
                                {previewSize === 'mobile' && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-black rounded-b-[24px] z-[100] border-x border-b border-white/[0.03]" />
                                )}
                            </div>
                        </div>

                        <div className="mt-20 flex items-center gap-16 opacity-10">
                            <Palette size={22} strokeWidth={1.5} />
                            <Play size={22} strokeWidth={1.5} />
                            <Sparkles size={22} strokeWidth={1.5} />
                        </div>
                    </div>
                </div>

                {/* BOTTOM BAR ACTION */}
                <div className="px-12 py-10 border-t border-white/[0.03] bg-white/[0.005] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center">
                            <Terminal size={14} className="text-emerald-500/60" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Sandbox Environment</span>
                            <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest mt-1">SECURE_SYNC_STATUS: ACTIVE</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="px-10 py-4 border border-white/5 hover:bg-white/[0.02] rounded-[22px] text-[11px] font-black uppercase tracking-[0.2em] text-white/20 transition-all flex items-center gap-3 active:scale-95">
                             Draft Local
                        </button>
                        <button 
                            onClick={handlePublish}
                            disabled={isPublishing || publishStatus === 'success'}
                            className={clsx(
                                "px-14 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3 shadow-2xl group",
                                publishStatus === 'success' ? "bg-emerald-500 text-white" : "bg-white text-black hover:scale-[1.02] active:scale-[0.98]"
                            )}
                        >
                            {isPublishing ? (
                                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : publishStatus === 'success' ? (
                                <><CheckCircle2 size={18} /> Published</>
                            ) : (
                                <><Rocket size={18} className="group-hover:-translate-y-1 transition-transform" /> Publish / Global</>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
