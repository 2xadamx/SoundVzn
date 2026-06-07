import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Search, Check, Wallet, ArrowRight, Zap, Terminal } from 'lucide-react';
import { socialService } from '../../utils/socialService';
import { CanvasRenderer } from '../common/CanvasRenderer';
import clsx from 'clsx';

interface MarketplaceTheme {
    id: string;
    name: string;
    description: string;
    price: number;
    creator_id: string;
    creator_name: string;
    css_content: string;
    category: string;
    is_verified: boolean;
}

interface ThemeMarketplaceProps {
    onClose: () => void;
    onPurchaseSuccess: () => void;
    onOpenStudio: () => void;
}

export const ThemeMarketplace: React.FC<ThemeMarketplaceProps> = ({ onClose, onPurchaseSuccess, onOpenStudio }) => {
    const [themes, setThemes] = useState<MarketplaceTheme[]>([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [purchasing, setPurchasing] = useState<string | null>(null);

    const categories = ['All', 'Animated', 'Minimal', 'Gradient', 'Interactive'];

    const loadData = async () => {
        setLoading(true);
        try {
            const [themesData, balanceData] = await Promise.all([
                socialService.getMarketplaceThemes(),
                socialService.getUserBalance()
            ]);
            setThemes(themesData);
            setBalance(balanceData);
        } catch (error) {
            console.error('Failed to load marketplace data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handlePurchase = async (theme: MarketplaceTheme) => {
        if (balance < theme.price) {
            alert('Saldo insuficiente.');
            return;
        }

        setPurchasing(theme.id);
        const res = await socialService.buyTheme(theme.id);
        
        if (res.success) {
            await loadData();
            onPurchaseSuccess();
        } else {
            alert(res.error || 'Error al procesar la compra');
        }
        setPurchasing(null);
    };

    const filteredThemes = themes.filter(t => 
        (selectedCategory === 'All' || t.category === selectedCategory) &&
        (t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="h-full flex flex-col bg-transparent overflow-hidden">
            <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col overflow-hidden bg-[#050505]/40 border-x border-white/[0.03] backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-10 py-8 border-b border-white/[0.04]">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-[22px] bg-white/5 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-white uppercase tracking-[0.05em]">Marketplace</h2>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                Curated community aesthetics
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-5 py-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex items-center gap-4">
                            <Wallet size={16} className="text-white/20" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black text-white tracking-widest leading-none">{balance} <span className="text-white/20">SC</span></span>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                        >
                            Volver
                        </button>
                    </div>
                </div>


                {/* Toolbar */}
                <div className="px-10 py-6 bg-white/[0.005] border-b border-white/[0.03] flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="relative min-w-[300px] group flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-5 py-3 transition-all focus-within:border-white/20">
                        <Search size={16} className="text-white/10 group-focus-within:text-white/40 transition-colors" />
                        <input 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Encontrar estéticas..." 
                            className="bg-transparent text-sm text-white outline-none placeholder:text-white/5 font-bold flex-1"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={clsx(
                                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                    selectedCategory === cat ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "text-white/20 hover:text-white/40 bg-white/[0.03] border border-white/[0.05]"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-6 opacity-10">
                            <div className="w-12 h-12 rounded-full border border-t-white border-white/10 animate-spin" />
                            <p className="font-black uppercase tracking-[0.4em] text-[10px]">Synchronizing Gallery</p>
                        </div>
                    ) : filteredThemes.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                            {filteredThemes.map(theme => (
                                <motion.div 
                                    layout
                                    key={theme.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="group flex flex-col"
                                >
                                    <div className="relative aspect-[4/5] rounded-[32px] overflow-hidden border border-white/[0.06] bg-[#08080a] mb-5 transition-all duration-500 group-hover:border-white/20 group-hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                                        <CanvasRenderer content={theme.css_content} />
                                        
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                        
                                        <div className="absolute top-5 right-5 flex flex-col gap-3">
                                            {theme.is_verified && (
                                                <div className="bg-white text-black p-1.5 rounded-full shadow-2xl" title="Verificado">
                                                    <Check size={10} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="absolute bottom-8 left-8 right-8 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 flex flex-col gap-3">
                                            <button 
                                                onClick={() => handlePurchase(theme)}
                                                disabled={purchasing === theme.id}
                                                className="w-full py-3.5 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                                            >
                                                {purchasing === theme.id ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                                ) : (
                                                    <>Adquirir Theme</>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="px-2">
                                        <div className="flex items-start justify-between mb-1.5">
                                            <h3 className="text-sm font-black text-white/90 group-hover:text-white transition-colors tracking-tight uppercase tracking-wider">{theme.name}</h3>
                                            <p className="text-[11px] font-black text-white/50">{theme.price} SC</p>
                                        </div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-[7px] font-black text-white/30 border border-white/5">
                                                {theme.creator_name[0]}
                                            </div>
                                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.15em]">{theme.creator_name}</p>
                                        </div>
                                        <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed font-medium">{theme.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-24 text-center">
                            <h3 className="text-lg font-black text-white/10 uppercase tracking-[0.3em] mb-4">No assets found</h3>
                            <button 
                                onClick={onOpenStudio}
                                className="px-8 py-3.5 border border-white/5 hover:border-white/20 rounded-2xl text-[10px] font-black text-white/20 hover:text-white transition-all uppercase tracking-widest"
                            >
                                <Zap size={12} className="inline mr-2" /> Initialize Studio
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-10 py-8 bg-white/[0.01] border-t border-white/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col gap-1">
                            <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Terminal size={12} /> Community-driven economy
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onOpenStudio}
                        className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-[0.15em] transition-all flex items-center gap-3 group"
                    >
                        <span>Start Creating in SVZN Studio</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};
