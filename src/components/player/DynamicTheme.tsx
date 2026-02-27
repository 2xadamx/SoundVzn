import { useEffect } from 'react';
import { usePlayerStore } from '../../store/player';
import { getDominantColor } from '../../utils/colorExtractor';

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

            const color = await getDominantColor(currentTrack.artwork);
            if (color) {
                // Extract numbers from rgb(r, g, b)
                const match = color.match(/\d+/g);
                if (match && match.length >= 3) {
                    const [r, g, b] = match;
                    document.documentElement.style.setProperty('--color-primary', color);
                    document.documentElement.style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`);
                    console.log(`🎨 Theme updated to match: ${currentTrack.title}`);
                }
            }
        };

        updateTheme();
    }, [currentTrack?.artwork, currentTrack?.id]);

    return null; // This component doesn't render anything
};
