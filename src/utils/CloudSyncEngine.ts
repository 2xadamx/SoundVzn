import { usePlayerStore } from '../store/player';
import { getAllTracks, getFollowedPlaylists } from './database';

export const CloudSyncEngine = {
    /**
     * Generates a complete backup of user data as a JSON blob.
     */
    async exportBackup(): Promise<Blob> {
        console.log('☁️ CloudSync: Generating Backup...');

        const allTracks = await getAllTracks();
        const likedTracks = allTracks.filter((t: any) => t.liked);
        const playlists = await getFollowedPlaylists();
        const { audioSettings, eqSettings } = usePlayerStore.getState();

        const backupData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            data: {
                favorites: likedTracks,
                playlists: playlists,
                settings: {
                    audio: audioSettings,
                    equalizer: eqSettings
                }
            }
        };

        const json = JSON.stringify(backupData, null, 2);
        return new Blob([json], { type: 'application/json' });
    },

    /**
     * Restores data from a backup JSON string.
     */
    async importBackup(jsonString: string): Promise<boolean> {
        try {
            const backup = JSON.parse(jsonString);
            if (backup.version !== '1.0.0') throw new Error('Incompatible backup version');

            console.log('☁️ CloudSync: Restoring Data...');

            const state = usePlayerStore.getState();
            if (backup.data.settings.audio) state.updateAudioSettings(backup.data.settings.audio);

            return true;
        } catch (e) {
            console.error('CloudSync Import Failed:', e);
            return false;
        }
    }
};
