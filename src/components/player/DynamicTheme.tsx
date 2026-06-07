import { useEffect } from 'react';
import { usePlayerStore } from '../../store/player';
import { getPalette } from '../../utils/colorExtractor';

export const DynamicTheme = () => {
    const currentTrack = usePlayerStore((state) => state.currentTrack);

    useEffect(() => {
        const updateTheme = async () => {
            if (!currentTrack?.artwork) {
                // Reset to default vibrant primary if no artwork
                document.documentElement.style.setProperty('--color-primary', '#ffffff');
                document.documentElement.style.setProperty('--color-primary-rgb', '255, 255, 255');
                return;
            }

            const palette = await getPalette(currentTrack.artwork);
            if (palette) {
                const { primary, secondary, accent, rgb } = palette;

                document.documentElement.style.setProperty('--color-primary', primary);
                document.documentElement.style.setProperty('--color-primary-rgb', `${rgb.primary.r}, ${rgb.primary.g}, ${rgb.primary.b}`);

                document.documentElement.style.setProperty('--color-secondary', secondary);
                document.documentElement.style.setProperty('--color-secondary-rgb', `${rgb.secondary.r}, ${rgb.secondary.g}, ${rgb.secondary.b}`);

                document.documentElement.style.setProperty('--color-accent', accent);
                document.documentElement.style.setProperty('--color-accent-rgb', `${rgb.accent.r}, ${rgb.accent.g}, ${rgb.accent.b}`);

                console.log(`🎨 Theme palette updated: ${currentTrack.title}`);
            }
        };

        updateTheme();
    }, [currentTrack?.artwork, currentTrack?.id]);

    return null; // This component doesn't render anything
};
