import axios from 'axios';
import { Logger } from '../utils/logger.js';
import * as secrets from '../secrets.js';

export class ExternalService {
    private static spotifyToken: string | null = null;
    private static spotifyExpiresAt = 0;

    /**
     * Gets a valid Spotify Client Credentials Token
     * Features: Auto-refresh & Error Resilience
     */
    public static async getSpotifyToken(): Promise<string> {
        const now = Date.now();
        if (this.spotifyToken && now < this.spotifyExpiresAt - 60000) {
            return this.spotifyToken;
        }

        try {
            Logger.info('[Spotify] Refreshing Access Token...');
            const auth = Buffer.from(`${secrets.SPOTIFY_CLIENT_ID}:${secrets.SPOTIFY_CLIENT_SECRET}`).toString('base64');
            const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`,
                },
                timeout: 5000
            });
            
            this.spotifyToken = response.data.access_token;
            this.spotifyExpiresAt = now + response.data.expires_in * 1000;
            Logger.info('[Spotify] Token refreshed successfully');
            return this.spotifyToken!;
        } catch (err: any) {
            Logger.error('[Spotify] Failed to get token', err.message);
            throw new Error('EXTERNAL_API_FAILURE');
        }
    }
}
