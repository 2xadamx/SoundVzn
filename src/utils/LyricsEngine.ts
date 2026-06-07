import { BACKEND_URL } from './apiConfig';

export interface LyricLine {
    time: number;
    text: string;
}

export const LyricsEngine = {
    async fetchLyrics(artist: string, title: string, duration?: number): Promise<LyricLine[]> {
        const cleanTitle = title.split(' (')[0].split(' - ')[0].trim();
        const cleanArtist = artist.split(',')[0].trim();

        // 1. Try Backend Cache First
        try {
            const cacheResponse = await fetch(`${BACKEND_URL}/api/lyrics?artist=${encodeURIComponent(cleanArtist)}&track=${encodeURIComponent(cleanTitle)}`);
            const cached = await cacheResponse.json();
            if (cached && cached.found) {
                if (cached.lrc_synced) return this.parseLRC(cached.lrc_synced);
                if (cached.plain_text) return this.parsePlainText(cached.plain_text, duration || 0);
            }
        } catch (e) {
            console.warn('[LyricsEngine] Cache check failed:', e);
        }

        // 2. Fetch from LRCLIB
        try {
            const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
            const response = await fetch(`https://lrclib.net/api/search?q=${query}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const lyricsData = data.find((item: any) => item.syncedLyrics) || data[0];

                // Save to backend cache
                this.saveToCache(cleanArtist, cleanTitle, lyricsData);

                if (lyricsData.syncedLyrics) {
                    return this.parseLRC(lyricsData.syncedLyrics);
                } else if (lyricsData.plainLyrics) {
                    return this.parsePlainText(lyricsData.plainLyrics, duration || 0);
                }
            }
            return [{ time: 0, text: "No hemos encontrado la letra para esta canción." }];
        } catch (error) {
            console.error('Error fetching lyrics:', error);
            return [{ time: 0, text: "Error al cargar la letra desde la red." }];
        }
    },

    async saveToCache(artist: string, title: string, data: any) {
        try {
            await fetch(`${BACKEND_URL}/api/lyrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    artist,
                    title,
                    lyrics: data.plainLyrics || '',
                    synced: data.syncedLyrics || null,
                    source: 'lrclib'
                })
            });
        } catch (e) {
            console.warn('[LyricsEngine] Save cache failed:', e);
        }
    },

    parseLRC(lrcText: string): LyricLine[] {
        const lines = lrcText.split('\n');
        return lines.map(line => {
            const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/) || line.match(/\[(\d+):(\d+)\](.*)/);
            if (match) {
                const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
                return { time, text: match[3].trim() };
            }
            return null;
        }).filter(l => l !== null) as LyricLine[];
    },

    parsePlainText(text: string, duration: number): LyricLine[] {
        const lines = text.split('\n').filter((l: string) => l.trim());
        if (lines.length === 0) return [];
        const lineDuration = duration > 0 ? duration / lines.length : 5;
        return lines.map((text: string, i: number) => ({
            time: lineDuration * i,
            text: text.trim()
        }));
    }
};
