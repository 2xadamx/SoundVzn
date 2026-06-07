import { db } from '../db/index.js';
import { Sanitizer } from '../utils/sanitizer.js';
import crypto from 'node:crypto';

export class SocialService {
    private db = db;

    // Prepared Statements for high-performance reuse
    private getFriendsStmt = this.db.prepare(`
        SELECT u.id, u.name, u.username, u.avatar, f.status,
               a.status as activity_status, a.track, a.artist, a.cover
        FROM friends f
        JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id) AND u.id != ?
        LEFT JOIN user_activity a ON u.id = a.user_id
        WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
    `);

    private updateActivityStmt = this.db.prepare(`
        INSERT INTO user_activity (user_id, status, track, artist, cover, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            status = excluded.status,
            track = excluded.track,
            artist = excluded.artist,
            cover = excluded.cover,
            updated_at = excluded.updated_at
    `);

    public getFriends(userId: string) {
        return this.getFriendsStmt.all(userId, userId, userId);
    }

    public updateActivity(userId: string, data: any) {
        return this.updateActivityStmt.run(
            userId, 
            data.status || 'online',
            data.track || null,
            data.artist || null,
            data.cover || null,
            Date.now()
        );
    }

    public async addFriend(userId: string, targetId: string) {
        const stmt = this.db.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id, status, created_at) VALUES (?, ?, ?, ?)');
        return stmt.run(userId, targetId, 'pending', Date.now()).changes > 0;
    }

    public togglePin(userId: string, friendId: string) {
        return this.db.prepare('UPDATE friends SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE user_id = ? AND friend_id = ?')
            .run(userId, friendId).changes > 0;
    }

    public toggleMute(userId: string, friendId: string) {
        return this.db.prepare('UPDATE friends SET is_muted = CASE WHEN is_muted = 1 THEN 0 ELSE 1 END WHERE user_id = ? AND friend_id = ?')
            .run(userId, friendId).changes > 0;
    }

    public searchUsers(query: string, excludeId: string) {
        const q = `%${Sanitizer.clean(query)}%`;
        return this.db.prepare(`
            SELECT u.id, u.svzn_id, u.name, u.username, u.avatar, f.status as friend_status
            FROM users u
            LEFT JOIN friends f ON (f.user_id = ? AND f.friend_id = u.id)
            WHERE (u.name LIKE ? OR u.username LIKE ? OR u.email LIKE ?) AND u.id != ?
            LIMIT 10
        `).all(excludeId, q, q, q, excludeId);
    }

    public checkUsernameExists(username: string) {
        return !!this.db.prepare('SELECT 1 FROM users WHERE username = ?').get(Sanitizer.cleanUsername(username));
    }

    public getFriendsPool(userId: string) {
        const rows = this.db.prepare(`
            SELECT f.friend_id, f.is_pinned, f.is_muted, u.id, u.svzn_id, u.name, u.username, u.avatar,
                   a.status, a.track, a.artist, a.cover, a.duration, a.progress,
                   n.type as note_type, n.text as note_text, n.audioB64, n.track as note_track,
                   n.artist as note_artist, n.cover as note_cover, n.previewUrl, n.theme, n.savedAt,
                   (SELECT COUNT(*) FROM social_messages m WHERE m.receiver_id = ? AND m.sender_id = u.id AND m.is_read = 0) as unreadCount
            FROM friends f
            JOIN users u ON u.id = f.friend_id
            LEFT JOIN user_activity a ON a.user_id = u.id
            LEFT JOIN user_notes n ON n.user_id = u.id
            WHERE f.user_id = ? AND f.status = 'accepted'
            ORDER BY f.is_pinned DESC, f.created_at ASC
        `).all(userId, userId) as any[];

        return rows.map((row) => ({
            id: row.id,
            svzn_id: row.svzn_id,
            username: row.username || row.name?.toLowerCase().replace(/\s+/g, ''),
            name: row.name,
            avatar: row.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(row.name || row.id)}`,
            status: row.status || 'offline',
            is_pinned: row.is_pinned === 1,
            is_muted: row.is_muted === 1,
            unreadCount: row.unreadCount || 0,
            activity: row.track ? {
                track: row.track,
                artist: row.artist,
                cover: row.cover,
                duration: row.duration,
                progress: row.progress,
            } : undefined,
            note: row.note_type && Date.now() - row.savedAt < 24 * 60 * 60 * 1000 ? {
                type: row.note_type,
                text: row.note_text,
                audioB64: row.audioB64,
                track: row.note_track,
                artist: row.note_artist,
                cover: row.note_cover,
                previewUrl: row.previewUrl,
                theme: row.theme,
                savedAt: row.savedAt,
            } : undefined,
        }));
    }

    public addFriendByTarget(userId: string, targetStr: string) {
        const cleanTarget = Sanitizer.clean(targetStr);
        const target = this.db.prepare(`
            SELECT * FROM users
            WHERE id = ? OR email = ? OR username = ? OR name = ? OR printf('%06d', svzn_id) = ?
        `).get(cleanTarget, cleanTarget.toLowerCase(), Sanitizer.cleanUsername(cleanTarget), cleanTarget, cleanTarget) as any;

        if (!target || target.id === userId) return null;

        const now = Date.now();
        this.db.prepare(`
            INSERT INTO friends (user_id, friend_id, status, created_at)
            VALUES (?, ?, 'pending', ?)
            ON CONFLICT(user_id, friend_id) DO UPDATE SET status = excluded.status
        `).run(userId, target.id, now);
        return { id: target.id, status: 'REQUEST_SENT' };
    }

    public removeFriend(userId: string, friendId: string) {
        this.db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(userId, friendId);
        this.db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(friendId, userId);
        return true;
    }

    public getPendingRequests(userId: string) {
        return this.db.prepare(`
            SELECT u.id, u.svzn_id, u.name, u.username, u.avatar
            FROM friends f
            JOIN users u ON u.id = f.user_id
            WHERE f.friend_id = ? AND f.status = 'pending'
            ORDER BY f.created_at DESC
        `).all(userId);
    }

    public respondRequest(userId: string, senderId: string, accept: boolean) {
        if (!accept) {
            this.db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').run(senderId, userId);
            return true;
        }
        const now = Date.now();
        const tx = this.db.transaction(() => {
            this.db.prepare(`
                INSERT INTO friends (user_id, friend_id, status, created_at)
                VALUES (?, ?, 'accepted', ?)
                ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'accepted'
            `).run(senderId, userId, now);
            this.db.prepare(`
                INSERT INTO friends (user_id, friend_id, status, created_at)
                VALUES (?, ?, 'accepted', ?)
                ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'accepted'
            `).run(userId, senderId, now);
        });
        tx();
        return true;
    }

    public clearChat(userId: string, friendId: string) {
        this.db.prepare('DELETE FROM social_messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)')
            .run(userId, friendId, friendId, userId);
        return true;
    }

    public saveNote(userId: string, note: any) {
        const type = ['text', 'audio', 'music'].includes(note?.type) ? note.type : 'text';
        this.db.prepare(`
            INSERT INTO user_notes (user_id, type, text, audioB64, track, artist, cover, previewUrl, theme, savedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                type = excluded.type, text = excluded.text, audioB64 = excluded.audioB64,
                track = excluded.track, artist = excluded.artist, cover = excluded.cover,
                previewUrl = excluded.previewUrl, theme = excluded.theme, savedAt = excluded.savedAt
        `).run(
            userId,
            type,
            note?.text ? Sanitizer.clean(note.text) : null,
            note?.audioB64 || null,
            note?.track ? Sanitizer.clean(note.track) : null,
            note?.artist ? Sanitizer.clean(note.artist) : null,
            note?.cover || null,
            note?.previewUrl || null,
            note?.theme || 'default',
            Date.now()
        );
        return true;
    }

    public updateActivity(userId: string, body: any) {
        try {
            const status = body?.status ? Sanitizer.clean(body.status).substring(0, 100) : 'online';
            const track = body?.trackInfo?.track ? Sanitizer.clean(body.trackInfo.track) : null;
            const artist = body?.trackInfo?.artist ? Sanitizer.clean(body.trackInfo.artist) : null;
            const cover = body?.trackInfo?.cover || null;
            const duration = body?.trackInfo?.duration ? Number(body.trackInfo.duration) : null;
            const progress = body?.trackInfo?.progress ? Number(body.trackInfo.progress) : null;
            const now = Date.now();
            this.db.prepare(`
                INSERT INTO user_activity (user_id, status, track, artist, cover, duration, progress, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    status = excluded.status,
                    track = excluded.track,
                    artist = excluded.artist,
                    cover = excluded.cover,
                    duration = excluded.duration,
                    progress = excluded.progress,
                    updated_at = excluded.updated_at
            `).run(userId, status, track, artist, cover, duration, progress, now);
            return true;
        } catch (err) {
            console.error('[SocialService] updateActivity error:', err);
            return false;
        }
    }

    public deleteNote(userId: string) {
        this.db.prepare('DELETE FROM user_notes WHERE user_id = ?').run(userId);
        return true;
    }

    public getChat(userId: string, friendId: string) {
        const rows = this.db.prepare(`
            SELECT * FROM social_messages
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            ORDER BY timestamp ASC
        `).all(userId, friendId, friendId, userId) as any[];
        this.db.prepare('UPDATE social_messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?').run(userId, friendId);
        return rows.map((row) => ({ ...row, track_data: row.track_data ? JSON.parse(row.track_data) : null }));
    }

    public sendMessage(userId: string, targetId: string, type: string, content: string, trackData?: any) {
        const relation = this.db.prepare(`
            SELECT 1 FROM friends 
            WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
            AND status = 'accepted'
        `).get(userId, targetId, targetId, userId);
        
        if (!relation) return false;
        
        const messageType = type === 'music' ? 'music' : 'text';
        const body = Sanitizer.clean(content || '').substring(0, 2000);
        
        if (!body && messageType === 'text' && !trackData) return false;
        
        try {
            this.db.prepare('INSERT INTO social_messages (sender_id, receiver_id, type, content, track_data, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
                .run(userId, targetId, messageType, body, trackData ? JSON.stringify(trackData).substring(0, 10000) : null, Date.now());
            return true;
        } catch (err) {
            console.error('[SocialService] Error inserting message:', err);
            return false;
        }
    }

    public getUserInventory(userId: string) {
        return this.db.prepare('SELECT t.* FROM marketplace_themes t JOIN user_inventory i ON t.id = i.theme_id WHERE i.user_id = ?')
            .all(userId);
    }

    public getMarketplaceThemes() {
        const rows = this.db.prepare(`
            SELECT t.*, u.name as creator_name
            FROM marketplace_themes t
            JOIN users u ON u.id = t.creator_id
            WHERE t.status = 'verified'
            ORDER BY t.created_at DESC
        `).all() as any[];

        return rows.map((theme) => {
            let config: any = {};
            try {
                config = theme.config_json ? JSON.parse(theme.config_json) : {};
            } catch {
                config = {};
            }
            return {
                id: theme.id,
                name: theme.name,
                description: config.description || '',
                price: theme.price || 0,
                creator_id: theme.creator_id,
                creator_name: theme.creator_name || 'SoundVzn',
                css_content: theme.css_content || '',
                category: config.category || 'Animated',
                is_verified: theme.status === 'verified',
                sales_count: theme.sales_count || 0,
            };
        });
    }

    public getUserBalance(userId: string) {
        this.db.prepare('INSERT OR IGNORE INTO user_balance (user_id, balance) VALUES (?, 100)').run(userId);
        const row = this.db.prepare('SELECT balance FROM user_balance WHERE user_id = ?').get(userId) as any;
        return row?.balance || 0;
    }

    public buyTheme(userId: string, themeId: string) {
        const theme = this.db.prepare('SELECT * FROM marketplace_themes WHERE id = ? AND status = "verified"').get(themeId) as any;
        if (!theme) return { success: false, error: 'Tema no encontrado' };

        const existing = this.db.prepare('SELECT 1 FROM user_inventory WHERE user_id = ? AND theme_id = ?').get(userId, themeId);
        if (existing) return { success: true, newBalance: this.getUserBalance(userId) };

        const balance = this.getUserBalance(userId);
        if (balance < theme.price) return { success: false, error: 'Saldo insuficiente' };

        const tx = this.db.transaction(() => {
            this.db.prepare('UPDATE user_balance SET balance = balance - ? WHERE user_id = ?').run(theme.price, userId);
            this.db.prepare('INSERT INTO user_inventory (user_id, theme_id, purchase_date) VALUES (?, ?, ?)').run(userId, themeId, Date.now());
            this.db.prepare('UPDATE marketplace_themes SET sales_count = sales_count + 1 WHERE id = ?').run(themeId);
        });
        tx();

        return { success: true, newBalance: balance - theme.price };
    }

    public publishTheme(userId: string, themeData: any) {
        const name = Sanitizer.clean(themeData?.name || '').substring(0, 80);
        const description = Sanitizer.clean(themeData?.description || '').substring(0, 240);
        const cssContent = typeof themeData?.css_content === 'string' ? themeData.css_content.substring(0, 50000) : '';
        const price = Math.max(0, Math.min(9999, Number(themeData?.price || 0)));
        const category = Sanitizer.clean(themeData?.category || 'Animated').substring(0, 40);

        if (!name || !description || !cssContent) {
            return { success: false };
        }

        const id = crypto.randomUUID();
        this.db.prepare(`
            INSERT INTO marketplace_themes (id, creator_id, name, price, css_content, config_json, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'verified', ?)
        `).run(id, userId, name, price, cssContent, JSON.stringify({ description, category }), Date.now());
        this.db.prepare('INSERT OR IGNORE INTO user_inventory (user_id, theme_id, purchase_date) VALUES (?, ?, ?)').run(userId, id, Date.now());
        return { success: true, themeId: id };
    }

    public getNoteInteractions(noteId: string) {
        const likers = this.db.prepare(`
            SELECT u.id, u.name, u.avatar
            FROM note_likes l
            JOIN users u ON u.id = l.liker_id
            WHERE l.note_id = ?
        `).all(noteId);
        const replies = this.db.prepare(`
            SELECT r.*, u.name, u.avatar
            FROM note_replies r
            JOIN users u ON u.id = r.user_id
            WHERE r.note_id = ?
            ORDER BY r.timestamp ASC
        `).all(noteId);
        return { likers, replies };
    }

    public toggleLike(noteId: string, userId: string) {
        const existing = this.db.prepare('SELECT 1 FROM note_likes WHERE note_id = ? AND liker_id = ?').get(noteId, userId);
        if (existing) {
            this.db.prepare('DELETE FROM note_likes WHERE note_id = ? AND liker_id = ?').run(noteId, userId);
            return { liked: false };
        }
        this.db.prepare('INSERT INTO note_likes (note_id, liker_id, timestamp) VALUES (?, ?, ?)').run(noteId, userId, Date.now());
        return { liked: true };
    }

    public addNoteReply(noteId: string, userId: string, text: string) {
        const content = Sanitizer.clean(text).substring(0, 500);
        if (!content) return false;
        this.db.prepare('INSERT INTO note_replies (note_id, user_id, content, timestamp) VALUES (?, ?, ?, ?)')
            .run(noteId, userId, content, Date.now());
        return true;
    }

    public getUserPlaylists(userId: string) {
        return this.db.prepare('SELECT * FROM playlists WHERE user_id = ? AND is_public = 1').all(userId);
    }

    public getUserFriends(userId: string) {
        return this.db.prepare(`
            SELECT u.id, u.name, u.username, u.avatar
            FROM friends f
            JOIN users u ON u.id = f.friend_id
            WHERE f.user_id = ? AND f.status = 'accepted'
            LIMIT 10
        `).all(userId);
    }

    public getUserAnthem(userId: string) {
        const row = this.db.prepare('SELECT anthem FROM users WHERE id = ?').get(userId) as any;
        return row?.anthem ? JSON.parse(row.anthem) : null;
    }

    public getUserPlaylists(userId: string) {
        const rows = this.db.prepare('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
        return rows.map(p => {
            const tracks = this.db.prepare('SELECT track_data FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC').all(p.id) as any[];
            return {
                ...p,
                trackIds: tracks.map(t => JSON.parse(t.track_data).id),
                tracks: tracks.map(t => JSON.parse(t.track_data))
            };
        });
    }

    public savePlaylist(userId: string, pl: any) {
        try {
            this.db.prepare(`
                INSERT INTO playlists (id, user_id, name, description, cover_url, is_public, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    description = excluded.description,
                    cover_url = excluded.cover_url,
                    is_public = excluded.is_public
            `).run(pl.id, userId, pl.name, pl.description || '', pl.artwork || '', pl.isPublic ? 1 : 0, pl.createdDate || Date.now());

            this.db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(pl.id);
            if (pl.tracks && Array.isArray(pl.tracks)) {
                const stmt = this.db.prepare('INSERT INTO playlist_tracks (playlist_id, track_data, position) VALUES (?, ?, ?)');
                pl.tracks.forEach((track: any, idx: number) => {
                    stmt.run(pl.id, JSON.stringify(track), idx);
                });
            }
            return true;
        } catch (e) {
            console.error('Error saving playlist:', e);
            return false;
        }
    }
}

export const socialService = new SocialService();
