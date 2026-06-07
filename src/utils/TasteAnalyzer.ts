import { Track, Mood } from '../types';

const SKIPS_KEY = 'svzn_mood_skips';

interface SkipRecord {
    mood: Mood;
    timestamp: number;
    duration: number;
    artist?: string;
}

export class TasteAnalyzer {
    static getSkips(): SkipRecord[] {
        try {
            const raw = localStorage.getItem(SKIPS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    static registerSkip(track: Track, mood: Mood, duration: number) {
        const skips = this.getSkips();
        // We include track title/artist in persistence for better heuristics if needed later
        skips.push({ mood, duration, timestamp: Date.now(), artist: track.artist });
        
        // Keep only last 50 skips
        if (skips.length > 50) skips.shift();
        
        localStorage.setItem(SKIPS_KEY, JSON.stringify(skips));
        console.log(`[TasteAnalyzer] Registered skip for mood: ${mood} after ${Math.round(duration)}s`);
    }

    static getMoodScores(): Record<Mood, number> {
        const skips = this.getSkips();
        const now = Date.now();
        const coefficients: Record<Mood, number> = {
            'Chill': 1, 'Dynamic': 1, 'Dark': 1, 'Party': 1, 'Melancholic': 1, 'Neutral': 1
        };

        // Penalize moods based on recent skips (last 1 hour is most relevant)
        skips.forEach(skip => {
            const ageHours = (now - skip.timestamp) / (1000 * 60 * 60);
            if (ageHours < 24) {
                const penalty = Math.max(0, 0.2 * (1 - ageHours / 24));
                coefficients[skip.mood] = Math.max(0.1, coefficients[skip.mood] - penalty);
            }
        });

        return coefficients;
    }

    static getTopMoods(): Mood[] {
        const scores = this.getMoodScores();
        return (Object.keys(scores) as Mood[])
            .sort((a, b) => scores[b] - scores[a]);
    }

    static isTrackPenalized(track: Track, mood: Mood): boolean {
        const skips = this.getSkips();
        const now = Date.now();
        // Last 2 hours
        const recentSkips = (skips as any[]).filter(s => (now - s.timestamp) < (1000 * 60 * 60 * 2)); 

        // Penalize if this specific artist was skipped twice very recently
        const artistSkips = recentSkips.filter(s => s.artist === track.artist).length;
        if (artistSkips >= 2) return true;

        // Penalize mood if it's been skipped too much (e.g. user clicked next 4 times on 'Dark' songs)
        const moodSkips = recentSkips.filter(s => s.mood === mood).length;
        if (moodSkips >= 4) return true;

        return false;
    }
}
