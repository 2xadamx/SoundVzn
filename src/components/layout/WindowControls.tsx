import React, { useState, useEffect } from 'react';
import { Minus, Maximize2, X } from 'lucide-react';

export const WindowControls: React.FC = () => {
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        // Only show custom controls if we are NOT on macOS
        setIsMac(navigator.userAgent.includes('Mac'));
    }, []);

    if (isMac) return null; // macOS uses native traffic lights on the left side

    return (
        <div className="flex items-center h-full no-drag ml-4">
            <button
                onClick={() => window.electron?.minimize()}
                className="h-full px-4 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                title="Minimizar"
            >
                <Minus size={16} />
            </button>
            <button
                onClick={() => window.electron?.maximize()}
                className="h-full px-4 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                title="Maximizar"
            >
                <Maximize2 size={14} />
            </button>
            <button
                onClick={() => window.electron?.close()}
                className="h-full px-4 text-white/50 hover:bg-red-500 hover:text-white transition-colors"
                title="Cerrar"
            >
                <X size={18} />
            </button>
        </div>
    );
};
