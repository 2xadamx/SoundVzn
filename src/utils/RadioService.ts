import { Track } from '../types';

export interface RadioStation {
    id: string;
    name: string;
    url: string;
    favicon: string;
    country: string;
    language: string;
    votes: number;
    tags: string[];
}

class RadioService {
    private API_BASE = 'https://de1.api.radio-browser.info/json';

    async searchStations(query: string): Promise<RadioStation[]> {
        try {
            const response = await fetch(`${this.API_BASE}/stations/byname/${encodeURIComponent(query)}?limit=20`);
            if (!response.ok) throw new Error(`Radio-Browser API error: ${response.status} ${response.statusText}`);
            const data = await response.json();
            return this.mapData(data);
        } catch (error) {
            console.error('Radio search error:', error);
            return [];
        }
    }

    async getTopStations(limit: number = 20): Promise<RadioStation[]> {
        try {
            const response = await fetch(`${this.API_BASE}/stations/topvote/${limit}`);
            if (!response.ok) throw new Error(`Radio-Browser API error: ${response.status} ${response.statusText}`);
            const data = await response.json();
            return this.mapData(data);
        } catch (error) {
            console.error('Radio top stations error:', error);
            return [];
        }
    }

    async getStationsByTag(tag: string, limit: number = 20): Promise<RadioStation[]> {
        try {
            const response = await fetch(`${this.API_BASE}/stations/bytag/${encodeURIComponent(tag)}?limit=${limit}`);
            if (!response.ok) throw new Error(`Radio-Browser API error: ${response.status} ${response.statusText}`);
            const data = await response.json();
            return this.mapData(data);
        } catch (error) {
            console.error('Radio stations by tag error:', error);
            return [];
        }
    }

    private mapData(data: any[]): RadioStation[] {
        return data.map(item => ({
            id: item.stationuuid,
            name: item.name,
            url: item.url_resolved || item.url,
            favicon: item.favicon,
            country: item.country,
            language: item.language,
            votes: item.votes,
            tags: item.tags ? item.tags.split(',') : []
        }));
    }

    mapToTrack(station: RadioStation): Track {
        return {
            id: station.id,
            title: station.name,
            artist: 'Radio Live',
            album: station.country || 'Worldwide',
            duration: 0, // Live
            filePath: station.url,
            format: 'Radio',
            artwork: station.favicon || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=200',
            favorite: false,
            dateAdded: new Date().toISOString(),
            playCount: 0,
            isLive: true
        };
    }
}

export const radioService = new RadioService();
