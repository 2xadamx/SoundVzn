import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Check, RefreshCw } from 'lucide-react';
import { api } from '../../utils/api';

const PRESET_COLORS = [
    '#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'
];

export const ThemeCustomizer: React.FC = () => {
    const [selectedColor, setSelectedColor] = useState('#4f46e5');
    const [saving, setSaving] = useState(false);

    const handleSave = async (color: string) => {
        setSelectedColor(color);
        setSaving(true);
        try {
            await api.post('/api/user/profile/update', { theme_color: color });
            // Update CSS Variable globally
            document.documentElement.style.setProperty('--primary-color', color);
        } catch (e) {
            console.error('Failed to save theme', e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-8 bg-white/5 backdrop-blur-3xl rounded-[32px] border border-white/10 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-500/20 rounded-2xl">
                    <Palette className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Estudio de Diseño</h3>
                    <p className="text-xs text-white/40">Personaliza tu identidad visual</p>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
                {PRESET_COLORS.map(color => (
                    <button
                        key={color}
                        onClick={() => handleSave(color)}
                        className="relative w-12 h-12 rounded-full overflow-hidden transition-transform active:scale-90 hover:scale-110"
                        style={{ backgroundColor: color }}
                    >
                        {selectedColor === color && (
                            <motion.div 
                                layoutId="active-color"
                                className="absolute inset-0 flex items-center justify-center bg-black/20"
                            >
                                <Check className="w-6 h-6 text-white" />
                            </motion.div>
                        )}
                    </button>
                ))}
                <button className="w-12 h-12 rounded-full bg-white/10 border border-dashed border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <RefreshCw className={`w-5 h-5 text-white/40 ${saving ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Color de Acento</span>
                    <span className="text-white font-mono uppercase text-xs">{selectedColor}</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        className="h-full"
                        style={{ backgroundColor: selectedColor }}
                    />
                </div>
            </div>
        </div>
    );
};
