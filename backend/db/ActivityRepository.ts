import { BaseRepository } from './UserRepository.js';

export interface ActivityEntity {
    user_id: string;
    status: string;
    track?: string;
    artist?: string;
    cover?: string;
    duration?: number;
    progress?: number;
    updated_at: number;
}

export class ActivityRepository extends BaseRepository {
    private upsertStmt = this.db.prepare(`
        INSERT INTO user_activity (user_id, status, track, artist, cover, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            status = excluded.status,
            track = excluded.track,
            artist = excluded.artist,
            cover = excluded.cover,
            updated_at = excluded.updated_at
    `);

    public update(activity: ActivityEntity): void {
        this.upsertStmt.run(
            activity.user_id,
            activity.status,
            activity.track || null,
            activity.artist || null,
            activity.cover || null,
            activity.updated_at
        );
    }

    public getByUserId(userId: string): ActivityEntity | null {
        return this.db.prepare('SELECT * FROM user_activity WHERE user_id = ?').get(userId) as ActivityEntity | null;
    }
}

export const activityRepository = new ActivityRepository();
