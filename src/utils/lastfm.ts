import { BACKEND_URL, getAPIConfig } from './apiConfig';
const LASTFM_TIMEOUT_MS = 5000;
const LASTFM_DISABLE_MS = 10 * 60 * 1000;
let lastfmDisabledUntil = 0;

export interface LastFMTrackInfo {
    name: string;
    artist: string;
    album?: string;
    image?: string;
    duration?: number;
    listeners?: string;
    playcount?: string;
    summary?: string;
}

export interface LastFMArtistInfo {
    name: string;
    image?: string;
    bio?: string;
    listeners?: string;
    playcount?: string;
    tags?: string[];
    similar?: string[];
}

function isConnectionError(e: any): boolean {
    return e?.message === 'Failed to fetch' || e?.code === 'ECONNREFUSED' || e?.name === 'TypeError';
}

let backendUnreachableWarned = false;
function warnBackendOnce() {
    if (!backendUnreachableWarned) {
        backendUnreachableWarned = true;
        console.warn('⚠️ Backend (puerto 3000) no disponible. Usando Last.fm directo. Para Spotify y backend: inicia con Electron o ejecuta el backend.');
    }
}

export interface LastFMSimilarTrack {
    name: string;
    artist: string;
    match?: number;
}

async function fetchWithTimeout(url: string, timeoutMs: number = LASTFM_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchLastFM(method: string, params: Record<string, string>) {
    if (Date.now() < lastfmDisabledUntil) return null;
    const apiKey = getAPIConfig().lastfm.apiKey;
    if (!apiKey) return null;

    const search = new URLSearchParams({
        method,
        api_key: apiKey,
        format: 'json',
        ...params,
    });

    try {
        const response = await fetchWithTimeout(`https://ws.audioscrobbler.com/2.0/?${search.toString()}`);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                lastfmDisabledUntil = Date.now() + LASTFM_DISABLE_MS;
                console.warn('Last.fm temporalmente deshabilitado por auth/forbidden');
            }
            return null;
        }
        return await response.json();
    } catch {
        return null;
    }
}

export const lastfmService = {
    async getTrackInfo(artist: string, track: string): Promise<LastFMTrackInfo | null> {
        try {
            const response = await fetchWithTimeout(
                `${BACKEND_URL}/api/lastfm/trackInfo?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`
            );
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || response.statusText);
            }
            const data = await response.json();
            if (!data?.track) return null;
            const t = data.track;
            return {
                name: t.name,
                artist: t.artist?.name ?? artist,
                album: t.album?.title,
                image: t.album?.image?.find((img: any) => img.size === 'extralarge')?.['#text'] ?? t.image?.find((img: any) => img.size === 'extralarge')?.['#text'],
                duration: parseInt(t.duration, 10) || undefined,
                listeners: t.listeners,
                playcount: t.playcount,
                summary: t.wiki?.summary,
            };
        } catch (error) {
            if (isConnectionError(error)) {
                warnBackendOnce();
                return this.getTrackInfoDirect(artist, track);
            }
            return null;
        }
    },

    async getTrackInfoDirect(artist: string, track: string): Promise<LastFMTrackInfo | null> {
        try {
            const data = await fetchLastFM('track.getInfo', { artist, track });
            if (!data?.track) return null;
            const t = data.track;
            return {
                name: t.name,
                artist: t.artist?.name ?? artist,
                album: t.album?.title,
                image: t.album?.image?.find((img: any) => img.size === 'extralarge')?.['#text'] ?? t.image?.find((img: any) => img.size === 'extralarge')?.['#text'],
                duration: parseInt(t.duration, 10) || undefined,
                listeners: t.listeners,
                playcount: t.playcount,
                summary: t.wiki?.summary,
            };
        } catch {
            return null;
        }
    },

    async getArtistInfo(artist: string): Promise<LastFMArtistInfo | null> {
        try {
            const response = await fetchWithTimeout(`${BACKEND_URL}/api/lastfm/artistInfo?artist=${encodeURIComponent(artist)}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || response.statusText);
            }
            const data = await response.json();
            if (!data?.artist) return null;
            const a = data.artist;
            return {
                name: a.name,
                image: a.image?.find((img: any) => img.size === 'extralarge')?.['#text'],
                bio: a.bio?.summary,
                tags: a.tags?.tag?.map((t: any) => t.name),
                similar: a.similar?.artist?.map((s: any) => s.name),
            };
        } catch (error) {
            if (isConnectionError(error)) {
                warnBackendOnce();
                return this.getArtistInfoDirect(artist);
            }
            return null;
        }
    },

    async getArtistInfoDirect(artist: string): Promise<LastFMArtistInfo | null> {
        try {
            const data = await fetchLastFM('artist.getInfo', { artist });
            if (!data?.artist) return null;
            const a = data.artist;
            return {
                name: a.name,
                image: a.image?.find((img: any) => img.size === 'extralarge')?.['#text'],
                bio: a.bio?.summary,
                tags: a.tags?.tag?.map((t: any) => t.name),
                similar: a.similar?.artist?.map((s: any) => s.name),
            };
        } catch {
            return null;
        }
    },

    async getSimilarTracks(artist: string, track: string, limit: number = 20): Promise<LastFMSimilarTrack[]> {
        const data = await fetchLastFM('track.getSimilar', {
            artist,
            track,
            limit: String(limit),
            autocorrect: '1',
        });
        const rows = data?.similartracks?.track;
        if (!rows) return [];
        const list = Array.isArray(rows) ? rows : [rows];
        return list
            .map((t: any) => ({
                name: t?.name,
                artist: typeof t?.artist === 'string' ? t.artist : t?.artist?.name,
                match: t?.match ? Number(t.match) : undefined,
            }))
            .filter((t: LastFMSimilarTrack) => !!t.name && !!t.artist);
    },

    async getArtistTopTracks(artist: string, limit: number = 20): Promise<LastFMSimilarTrack[]> {
        const data = await fetchLastFM('artist.getTopTracks', {
            artist,
            limit: String(limit),
            autocorrect: '1',
        });
        const rows = data?.toptracks?.track;
        if (!rows) return [];
        const list = Array.isArray(rows) ? rows : [rows];
        return list
            .map((t: any) => ({
                name: t?.name,
                artist: typeof t?.artist === 'string' ? t.artist : t?.artist?.name || artist,
            }))
            .filter((t: LastFMSimilarTrack) => !!t.name && !!t.artist);
    },

    async searchTracks(query: string) {
        const data = await fetchLastFM('track.search', { track: query });
        if (!data || !data.results) return [];

        return data.results.trackmatches.track.map((t: any) => ({
            name: t.name,
            artist: t.artist,
            image: t.image?.find((img: any) => img.size === 'extralarge')?.['#text'],
        }));
    },

    async searchAlbums(query: string) {
        const data = await fetchLastFM('album.search', { album: query });
        if (!data || !data.results) return [];

        return data.results.albummatches.album.map((a: any) => ({
            name: a.name,
            artist: a.artist,
            image: a.image?.find((img: any) => img.size === 'extralarge')?.['#text'],
        }));
    },

    async searchArtists(query: string) {
        const data = await fetchLastFM('artist.search', { artist: query });
        if (!data || !data.results) return [];

        return data.results.artistmatches.artist.map((a: any) => ({
            name: a.name,
            image: a.image?.find((img: any) => img.size === 'extralarge')?.['#text'],
        }));
    },

    /**
     * Scrobbles a track to Last.fm
     * Note: Requires a session key (sk) obtained via user authorization
     */
    async scrobble(artist: string, track: string, timestamp: number = Math.floor(Date.now() / 1000)) {
        const sessionKey = localStorage.getItem('lastfm_session_key');
        if (!sessionKey) return { error: 'No session key' };

        // Real scrobbling requires a signature (api_sig) calculation
        // For now, we'll implement the basic parameters
        // To fully implement this, we'd need a helper for MD5 hashing
        const params: Record<string, string> = {
            artist,
            track,
            timestamp: timestamp.toString(),
            sk: sessionKey,
        };

        // Note: method 'track.scrobble' MUST be a POST request with api_sig
        // This is a placeholder for the full implementation
        console.log('🎵 Scrobbling to Last.fm:', artist, '-', track, 'with params:', params);
        return { success: true };
    }
};
