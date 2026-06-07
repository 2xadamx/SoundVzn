import { usePlayerStore } from '../store/player';

export const SleepTimerEngine = {
    timerId: null as any,
    fadeIntervalId: null as any,

    /**
     * Sets a sleep timer that stops playback after X minutes.
     * Includes a smooth logarithmic fade-out in the last 60 seconds.
     */
    setTimer(minutes: number) {
        this.clearTimer();
        const { setSleepTimer } = usePlayerStore.getState();
        setSleepTimer(minutes);

        const ms = minutes * 60 * 1000;
        const fadeStartMs = Math.max(0, ms - 60000); // Start fade 1 minute before end

        console.log(`🌙 SleepTimer: Set for ${minutes} minutes. Fade starts in ${fadeStartMs / 1000}s`);

        this.timerId = setTimeout(() => {
            this.startFadeOut();
        }, fadeStartMs);
    },

    /**
     * Initiates a smooth logarithmic volume reduction.
     */
    startFadeOut() {
        const { volume, setVolume, setIsPlaying, setSleepTimer } = usePlayerStore.getState();
        let currentVol = volume;
        const stepTime = 1000;

        console.log('🌙 SleepTimer: Fading out...');

        this.fadeIntervalId = setInterval(() => {
            // Logarithmic decrease is more natural to human hearing
            currentVol *= 0.9;

            if (currentVol < 0.01) {
                this.clearTimer();
                setVolume(0); // Silence before stop
                setIsPlaying(false);
                setSleepTimer(null);
                console.log('🌙 SleepTimer: Time up. Playback stopped.');
            } else {
                setVolume(currentVol, true); // Silent volume update (no UI toast)
            }
        }, stepTime);
    },

    /**
     * Cancels any active sleep timer or fade-out.
     */
    clearTimer() {
        if (this.timerId) clearTimeout(this.timerId);
        if (this.fadeIntervalId) clearInterval(this.fadeIntervalId);
        this.timerId = null;
        this.fadeIntervalId = null;
    }
};
