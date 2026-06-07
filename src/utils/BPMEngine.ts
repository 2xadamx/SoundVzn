import { getAudioProcessor } from './audioProcessor';

export const BPMEngine = {
    /**
     * Estimates BPM of the currently playing audio using frequency analysis.
     */
    async estimateCurrentBPM(durationMs: number = 2000): Promise<number> {
        const ap = getAudioProcessor();
        if (!ap || !ap.analyserNode) return 120; // Default fallback

        const bufferLength = ap.analyserNode.fftSize;
        const dataArray = new Float32Array(bufferLength);
        const peaks: number[] = [];
        const startTime = performance.now();

        // Threshold for peak detection (this would be tuned)
        const threshold = 0.8;

        return new Promise((resolve) => {
            const detect = () => {
                if (performance.now() - startTime > durationMs) {
                    const bpm = this.calculateBPMFromPeaks(peaks);
                    resolve(bpm);
                    return;
                }

                ap.analyserNode.getFloatTimeDomainData(dataArray);

                // Find local maximum in this window
                let max = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const val = Math.abs(dataArray[i]);
                    if (val > max) max = val;
                }

                if (max > threshold) {
                    peaks.push(performance.now());
                }

                requestAnimationFrame(detect);
            };
            detect();
        });
    },

    calculateBPMFromPeaks(peaks: number[]): number {
        if (peaks.length < 2) return 120;

        const intervals: number[] = [];
        for (let i = 1; i < peaks.length; i++) {
            const diff = peaks[i] - peaks[i - 1];
            // Filter out intervals that are too small (noise) or too large
            if (diff > 300 && diff < 2000) {
                intervals.push(diff);
            }
        }

        if (intervals.length === 0) return 120;

        // Average intervals
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpm = 60000 / avgInterval;

        // Clamp to reasonable musical ranges
        if (bpm < 60) return bpm * 2;
        if (bpm > 180) return bpm / 2;

        return Math.round(bpm);
    },

    /**
     * Calculates the playbackRate needed to match targetBPM from sourceBPM.
     */
    calculatePlaybackRate(sourceBPM: number, targetBPM: number): number {
        if (sourceBPM <= 0 || targetBPM <= 0) return 1.0;
        const ratio = targetBPM / sourceBPM;
        // Clamp to +/- 10% to avoid extreme pitching
        return Math.max(0.9, Math.min(1.1, ratio));
    }
};
