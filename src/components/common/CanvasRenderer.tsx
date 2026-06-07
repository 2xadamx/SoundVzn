import React, { useMemo } from 'react';

interface CanvasRendererProps {
    content: string;
    config?: any;
    className?: string;
    children?: React.ReactNode;
}

/**
 * CanvasRenderer: Ultra-secure component to render user-generated HTML/CSS/JS "genialidades".
 * Uses a sandboxed iframe with unique opaque origin to prevent access to the main app DOM/Storage.
 */
export const CanvasRenderer: React.FC<CanvasRendererProps> = ({ 
    content, 
    className = "", 
    children 
}) => {
    // Generate the sandboxed iframe content
    const iframeSrcDoc = useMemo(() => {
        const trimmed = content.trim().toLowerCase();
        // If it looks like a full HTML document, use it as is
        if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
            return content;
        }

        // Otherwise, wrap it as CSS content for backward compatibility/simplicity
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body, html { 
                        margin: 0; padding: 0; width: 100%; height: 100%; 
                        overflow: hidden; background: transparent; 
                    }
                    .canvas-container { 
                        width: 100%; height: 100%; position: relative; 
                    }
                    ${content}
                </style>
            </head>
            <body>
                <div id="diamonds" class="canvas-container theme-canvas"></div>
            </body>
            </html>
        `;
    }, [content]);

    return (
        <div className={`relative w-full h-full overflow-hidden ${className}`}>
            {/* The background layer (User Generated) */}
            <iframe
                title="Canvas Sandbox"
                srcDoc={iframeSrcDoc}
                sandbox="allow-scripts"
                className="absolute inset-0 w-full h-full border-none pointer-events-none"
                style={{ background: 'transparent' }}
            />
            
            {/* The content layer (App Controlled) */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};
