import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

/**
 * Enterprise Database Provider
 * Implements a Singleton pattern for database connections with PRAGMA optimizations
 * for high-performance concurrent reads (WAL mode).
 */
export class DB {
    private static instance: Database.Database;
    private static initialized = false;

    public static getInstance(): Database.Database {
        if (!this.instance) {
            this.init();
        }
        return this.instance;
    }

    private static init() {
        if (this.initialized) return;

        // REINFORCEMENT: Use cross-platform user data directory
        const baseDataDir = process.env.SOUNDVZN_DATA_DIR || 
                           path.join(process.cwd(), '.soundvzn_data');
        
        if (!fs.existsSync(baseDataDir)) {
            fs.mkdirSync(baseDataDir, { recursive: true });
        }

        const dbPath = path.join(baseDataDir, 'auth.db');
        console.log(`[Database] Initializing Enterprise DB at: ${dbPath}`);

        this.instance = new Database(dbPath, { 
            timeout: 5000,
            verbose: process.env.NODE_ENV === 'development' ? console.log : undefined 
        });

        // PRAGMA Optimizations
        this.instance.pragma('journal_mode = WAL');
        this.instance.pragma('synchronous = NORMAL');
        this.instance.pragma('temp_store = MEMORY');
        this.instance.pragma('cache_size = -16000'); // 16MB cache

        this.createTables();
        this.initialized = true;
    }

    private static createTables() {
        this.instance.exec(`
            CREATE TABLE IF NOT EXISTS users (
                svzn_id INTEGER PRIMARY KEY AUTOINCREMENT,
                id TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                username TEXT UNIQUE,
                tier TEXT DEFAULT 'standard',
                verified INTEGER DEFAULT 0,
                avatar TEXT,
                banner TEXT,
                bio TEXT,
                theme_color TEXT DEFAULT '#4f46e5',
                genres TEXT,
                anthem TEXT,
                created_at INTEGER NOT NULL,
                security_score INTEGER DEFAULT 50
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                action TEXT NOT NULL,
                ip_address TEXT,
                timestamp INTEGER NOT NULL,
                details TEXT
            );

            CREATE TABLE IF NOT EXISTS refresh_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                ip_address TEXT,
                device_info TEXT,
                expires_at INTEGER NOT NULL,
                revoked INTEGER DEFAULT 0,
                replaced_by TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS user_activity (
                user_id TEXT PRIMARY KEY,
                status TEXT DEFAULT 'offline',
                track TEXT,
                artist TEXT,
                cover TEXT,
                duration INTEGER,
                progress INTEGER,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS friends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                friend_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                is_pinned INTEGER DEFAULT 0,
                is_muted INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                UNIQUE(user_id, friend_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(friend_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS verification_codes (
                email TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                failed_attempts INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS rate_limits (
                ip_address TEXT PRIMARY KEY,
                attempts INTEGER DEFAULT 0,
                lockout_until INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS play_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                track_id TEXT,
                track_name TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT,
                cover_url TEXT,
                duration_ms INTEGER,
                played_at INTEGER NOT NULL,
                source TEXT DEFAULT 'spotify',
                completed INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS user_notes (
                user_id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                text TEXT,
                audioB64 TEXT,
                track TEXT,
                artist TEXT,
                cover TEXT,
                previewUrl TEXT,
                theme TEXT DEFAULT 'default',
                savedAt INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS social_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                type TEXT DEFAULT 'text',
                content TEXT,
                track_data TEXT,
                timestamp INTEGER NOT NULL,
                is_read INTEGER DEFAULT 0,
                FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS note_likes (
                note_id TEXT NOT NULL,
                liker_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                PRIMARY KEY(note_id, liker_id)
            );

            CREATE TABLE IF NOT EXISTS note_replies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS marketplace_themes (
                id TEXT PRIMARY KEY,
                creator_id TEXT NOT NULL,
                name TEXT NOT NULL,
                price INTEGER DEFAULT 0,
                css_content TEXT,
                config_json TEXT,
                status TEXT DEFAULT 'pending',
                sales_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_inventory (
                user_id TEXT NOT NULL,
                theme_id TEXT NOT NULL,
                purchase_date INTEGER NOT NULL,
                PRIMARY KEY(user_id, theme_id)
            );

            CREATE TABLE IF NOT EXISTS user_balance (
                user_id TEXT PRIMARY KEY,
                balance INTEGER DEFAULT 100
            );

            -- Performance Indexes
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
            CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
            CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_activity_updated ON user_activity(updated_at);
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                content TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS blocks (
                user_id TEXT NOT NULL,
                blocked_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY(user_id, blocked_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(blocked_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS playlists (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                cover_url TEXT,
                is_public INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS playlist_tracks (
                playlist_id TEXT NOT NULL,
                track_data TEXT NOT NULL,
                position INTEGER NOT NULL,
                PRIMARY KEY(playlist_id, position),
                FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
            );

            -- Social Indexes
            CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
            CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, is_read);
            CREATE INDEX IF NOT EXISTS idx_social_messages_conversation ON social_messages(sender_id, receiver_id);
            CREATE INDEX IF NOT EXISTS idx_social_messages_receiver ON social_messages(receiver_id, is_read);
        `);

        for (const sql of [
            'ALTER TABLE friends ADD COLUMN is_pinned INTEGER DEFAULT 0',
            'ALTER TABLE friends ADD COLUMN is_muted INTEGER DEFAULT 0',
            'ALTER TABLE user_activity ADD COLUMN duration INTEGER',
            'ALTER TABLE user_activity ADD COLUMN progress INTEGER',
            'ALTER TABLE users ADD COLUMN avatar TEXT',
            'ALTER TABLE users ADD COLUMN bio TEXT',
            'ALTER TABLE users ADD COLUMN genres TEXT',
            'ALTER TABLE users ADD COLUMN banner TEXT',
            'ALTER TABLE users ADD COLUMN anthem TEXT',
            'ALTER TABLE users ADD COLUMN theme_color TEXT DEFAULT \'#4f46e5\'',
            'ALTER TABLE users ADD COLUMN security_score INTEGER DEFAULT 50',
            'ALTER TABLE refresh_tokens ADD COLUMN ip_address TEXT',
            'ALTER TABLE refresh_tokens ADD COLUMN device_info TEXT',
            'ALTER TABLE refresh_tokens ADD COLUMN replaced_by TEXT',
            'ALTER TABLE refresh_tokens ADD COLUMN revoked INTEGER DEFAULT 0',
        ]) {
            try {
                this.instance.exec(sql);
            } catch {
                // Column already exists in older local databases.
            }
        }
    }
}

export const db = DB.getInstance();
