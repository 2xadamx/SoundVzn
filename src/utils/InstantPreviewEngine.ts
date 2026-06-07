import { usePlayerStore } from '../store/player';

let previewAudio: HTMLAudioElement | null = null;
let currentPreviewUrl: string | null = null;

export const InstantPreviewEngine = {
    /**
     * Plays a short preview of a track.
     */
    async playPreview(url: string | undefined) {
        if (!usePlayerStore.getState().enableInstantPreview) return;
        if (!url || url === currentPreviewUrl) return;

        this.stopPreview();

        console.log('🎧 InstantPreview: Starting preview for:', url);
        currentPreviewUrl = url;
        previewAudio = new Audio(url);
        previewAudio.volume = 0;

        try {
            await previewAudio.play();
            // Fade in
            let vol = 0;
            const fadeIn = setInterval(() => {
                vol += 0.1;
                if (previewAudio) previewAudio.volume = Math.min(vol, 0.4);
                if (vol >= 0.4) clearInterval(fadeIn);
            }, 50);

            // Auto-stop after 5 seconds
            setTimeout(() => {
                if (currentPreviewUrl === url) {
                    this.stopPreview();
                }
            }, 6000);

        } catch (e) {
            console.warn('Playback failed:', e);
        }
    },

    /**
     * Stops any currently playing preview with a fade out.
     */
    stopPreview() {
        if (!previewAudio) return;

        const audioToStop = previewAudio;
        previewAudio = null;
        currentPreviewUrl = null;

        let vol = audioToStop.volume;
        const fadeOut = setInterval(() => {
            vol -= 0.1;
            audioToStop.volume = Math.max(vol, 0);
            if (vol <= 0) {
                clearInterval(fadeOut);
                audioToStop.pause();
                audioToStop.src = '';
            }
        }, 50);
    }
};
