import { createRequire } from 'node:module';
import path from 'path';
import fs from 'fs';
const require = createRequire(import.meta.url);

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
import { mailer } from './mailer';
import crypto from 'crypto';
import axios from 'axios';
import https from 'https';
const Database = require('better-sqlite3');
import { JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from './secrets';

const getJWTSecret = () => {
  if (JWT_SECRET) return JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return 'dev_only_soundvzn_secret_change_me';
};
const SALT_ROUNDS = 12; // Industrial standard
const googleAxiosConfig = process.env.NODE_ENV === 'production'
  ? {}
  : { httpsAgent: new https.Agent({ rejectUnauthorized: false }) };

let db: any;
let stmts: any = {};
let initialized = false;
let userDataPath: string;

function initializeDb() {
  if (initialized) return;

  const localDataPath = path.join(process.cwd(), '.soundvzn_data');
  const baseDataDir = process.env.SOUNDVZN_USER_DATA;
  
  if (fs.existsSync(localDataPath)) {
    userDataPath = localDataPath;
  } else if (baseDataDir && path.isAbsolute(baseDataDir)) {
    userDataPath = baseDataDir;
  } else {
    userDataPath = localDataPath;
  }

  try {
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
  } catch (e: any) {
    userDataPath = process.cwd();
  }

  const dbPath = path.join(userDataPath, 'auth.db');
  console.log(`[Security] Initializing DB at: ${dbPath}`);

  try {
    db = new Database(dbPath, { timeout: 5000 });
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    // 1. Ensure basic table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    // 2. Safely add missing columns one by one
    const addColumn = (col: string, type: string) => {
      try {
        db.exec(`ALTER TABLE users ADD COLUMN ${col} ${type}`);
        console.log(`[Security] Added column ${col} to users`);
      } catch (e) {
        // Column probably exists, ignore
      }
    };

    addColumn('username', 'TEXT');
    addColumn('svzn_id', 'INTEGER');
    addColumn('avatar', 'TEXT');
    addColumn('bio', 'TEXT');
    addColumn('tier', "TEXT DEFAULT 'standard'");
    addColumn('verified', 'INTEGER DEFAULT 0');
    addColumn('security_score', 'INTEGER DEFAULT 50');

    // 3. Create indices
    try {
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_svznid ON users(svzn_id)");
    } catch (e) {}

    // 4. Data Fixes (SVZN_ID and USERNAME)
    try {
      const usersWithoutId = db.prepare("SELECT id FROM users WHERE svzn_id IS NULL").all();
      for (const u of usersWithoutId) {
        const randId = Math.floor(100000 + Math.random() * 900000);
        db.prepare("UPDATE users SET svzn_id = ? WHERE id = ?").run(randId, u.id);
      }
      db.exec("UPDATE users SET username = LOWER(REPLACE(name, ' ', '')) WHERE username IS NULL");
    } catch (e) {}

    // 5. Create other tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        email TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at INTEGER NOT NULL, failed_attempts INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT NOT NULL, ip_address TEXT, timestamp INTEGER NOT NULL, details TEXT
      );
      CREATE TABLE IF NOT EXISTS rate_limits (
        ip_address TEXT PRIMARY KEY, attempts INTEGER DEFAULT 0, lockout_until INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS play_history (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, track_id TEXT, track_name TEXT NOT NULL, artist TEXT NOT NULL, album TEXT, cover_url TEXT, duration_ms INTEGER, played_at INTEGER NOT NULL, source TEXT DEFAULT 'spotify', completed INTEGER DEFAULT 0, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY, crossfade_seconds INTEGER DEFAULT 0, audio_quality TEXT DEFAULT 'standard', discover_mode INTEGER DEFAULT 0, volume REAL DEFAULT 0.8, repeat_mode TEXT DEFAULT 'none', shuffle INTEGER DEFAULT 0, updated_at INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS lyrics_cache (
        id TEXT PRIMARY KEY, track_name TEXT NOT NULL, artist TEXT NOT NULL, lrc_synced TEXT, plain_text TEXT, source TEXT DEFAULT 'lrclib', fetched_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS friends (
        user_id TEXT NOT NULL, friend_id TEXT NOT NULL, status TEXT DEFAULT 'accepted', created_at INTEGER NOT NULL, is_pinned INTEGER DEFAULT 0, PRIMARY KEY (user_id, friend_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(friend_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS user_activity (
        user_id TEXT PRIMARY KEY, status TEXT DEFAULT 'offline', track TEXT, artist TEXT, cover TEXT, duration INTEGER, progress INTEGER, updated_at INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS user_notes (
        user_id TEXT PRIMARY KEY, type TEXT NOT NULL, text TEXT, audioB64 TEXT, track TEXT, artist TEXT, cover TEXT, previewUrl TEXT, theme TEXT DEFAULT 'default', savedAt INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS social_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL, type TEXT DEFAULT 'text', content TEXT, track_data TEXT, timestamp INTEGER NOT NULL, is_read INTEGER DEFAULT 0, FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS note_likes (
        note_id TEXT NOT NULL, liker_id TEXT NOT NULL, timestamp INTEGER NOT NULL, PRIMARY KEY (note_id, liker_id), FOREIGN KEY(note_id) REFERENCES user_notes(user_id) ON DELETE CASCADE, FOREIGN KEY(liker_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS note_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT, note_id TEXT NOT NULL, user_id TEXT NOT NULL, content TEXT NOT NULL, timestamp INTEGER NOT NULL, FOREIGN KEY(note_id) REFERENCES user_notes(user_id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS marketplace_themes (
        id TEXT PRIMARY KEY, creator_id TEXT NOT NULL, name TEXT NOT NULL, price INTEGER DEFAULT 0, css_content TEXT, config_json TEXT, status TEXT DEFAULT 'pending', sales_count INTEGER DEFAULT 0, created_at INTEGER NOT NULL, FOREIGN KEY(creator_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS user_inventory (
        user_id TEXT NOT NULL, theme_id TEXT NOT NULL, purchase_date INTEGER NOT NULL, PRIMARY KEY(user_id, theme_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(theme_id) REFERENCES marketplace_themes(id)
      );
      CREATE TABLE IF NOT EXISTS user_balance (
        user_id TEXT PRIMARY KEY, balance INTEGER DEFAULT 100, FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    stmts = {
      getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
      getUserByName: db.prepare('SELECT * FROM users WHERE name = ?'),
      getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
      getUserBySvznId: db.prepare('SELECT * FROM users WHERE svzn_id = ?'),
      getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
      insertUser: db.prepare('INSERT INTO users (id, svzn_id, email, password_hash, name, username, avatar, created_at, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)'),
      updateVerification: db.prepare('UPDATE users SET verified = 1, security_score = security_score + 25 WHERE email = ?'),
      updatePassword: db.prepare('UPDATE users SET password_hash = ? WHERE email = ?'),
      updateProfile: db.prepare('UPDATE users SET name = COALESCE(?, name), username = COALESCE(?, username), avatar = COALESCE(?, avatar), bio = COALESCE(?, bio) WHERE id = ?'),
      setVerificationCode: db.prepare('INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, failed_attempts = 0'),
      getVerificationCode: db.prepare('SELECT * FROM verification_codes WHERE email = ?'),
      deleteVerificationCode: db.prepare('DELETE FROM verification_codes WHERE email = ?'),
      storeRefreshToken: db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)'),
      getRefreshToken: db.prepare('SELECT * FROM refresh_tokens WHERE token = ?'),
      deleteRefreshToken: db.prepare('DELETE FROM refresh_tokens WHERE token = ?'),
      logAudit: db.prepare('INSERT INTO audit_logs (user_id, action, ip_address, timestamp, details) VALUES (?, ?, ?, ?, ?)'),
      getAuditLogs: db.prepare('SELECT action, ip_address, timestamp, details FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20'),
      getRateLimit: db.prepare('SELECT * FROM rate_limits WHERE ip_address = ?'),
      upsertRateLimit: db.prepare('INSERT INTO rate_limits (ip_address, attempts, lockout_until) VALUES (?, ?, ?) ON CONFLICT(ip_address) DO UPDATE SET attempts = excluded.attempts, lockout_until = excluded.lockout_until'),
      resetRateLimit: db.prepare('DELETE FROM rate_limits WHERE ip_address = ?'),
      logPlayback: db.prepare('INSERT INTO play_history (id, user_id, track_id, track_name, artist, album, cover_url, duration_ms, played_at, source, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
      getStats: db.prepare('SELECT (SELECT COUNT(DISTINCT track_id) FROM play_history WHERE user_id = ?) as totalTracks, (SELECT SUM(duration_ms) / 60000.0 FROM play_history WHERE user_id = ?) as totalMinutes, (SELECT artist FROM play_history WHERE user_id = ? GROUP BY artist ORDER BY COUNT(*) DESC LIMIT 1) as topArtist, (SELECT track_name FROM play_history WHERE user_id = ? GROUP BY track_name ORDER BY COUNT(*) DESC LIMIT 1) as mostPlayed'),
      getWeeklyActivity: db.prepare('SELECT strftime(\'%w\', datetime(played_at / 1000, \'unixepoch\')) as dayOfWeek, COUNT(*) as count FROM play_history WHERE user_id = ? AND played_at > ? GROUP BY dayOfWeek'),
      getTopTracks: db.prepare('SELECT track_name as title, artist, COUNT(*) as count FROM play_history WHERE user_id = ? GROUP BY track_name, artist ORDER BY count DESC LIMIT 5'),
      getContinueListening: db.prepare('SELECT * FROM play_history WHERE user_id = ? AND completed = 0 GROUP BY track_name ORDER BY played_at DESC LIMIT 10'),
      getHistory: db.prepare('SELECT * FROM play_history WHERE user_id = ? ORDER BY played_at DESC LIMIT 50'),
      getPreferences: db.prepare('SELECT * FROM user_preferences WHERE user_id = ?'),
      upsertPreferences: db.prepare('INSERT INTO user_preferences (user_id, crossfade_seconds, audio_quality, discover_mode, volume, repeat_mode, shuffle, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET crossfade_seconds = excluded.crossfade_seconds, audio_quality = excluded.audio_quality, discover_mode = excluded.discover_mode, volume = excluded.volume, repeat_mode = excluded.repeat_mode, shuffle = excluded.shuffle, updated_at = excluded.updated_at'),
      getLyricsByHash: db.prepare('SELECT * FROM lyrics_cache WHERE id = ?'),
      getLyricsByName: db.prepare('SELECT * FROM lyrics_cache WHERE artist = ? AND track_name = ? COLLATE NOCASE'),
      setLyrics: db.prepare('INSERT INTO lyrics_cache (id, track_name, artist, lrc_synced, plain_text, source, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET lrc_synced = excluded.lrc_synced, plain_text = excluded.plain_text, source = excluded.source, fetched_at = excluded.fetched_at'),
      getFriendsIds: db.prepare('SELECT friend_id, is_pinned FROM friends WHERE user_id = ? AND status = "accepted" ORDER BY is_pinned DESC, created_at ASC'),
      addFriend: db.prepare('INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, friend_id) DO UPDATE SET status = excluded.status'),
      removeFriend: db.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?'),
      togglePin: db.prepare('UPDATE friends SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE user_id = ? AND friend_id = ?'),
      clearFriendMessages: db.prepare('DELETE FROM social_messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)'),
      searchUsers: db.prepare('SELECT id, name, username, email, avatar, svzn_id FROM users WHERE name LIKE ? OR username LIKE ? OR email LIKE ? OR CAST(svzn_id AS TEXT) LIKE ? LIMIT 15'),
      getPendingRequests: db.prepare('SELECT user_id as sender_id FROM friends WHERE friend_id = ? AND status = "pending"'),
      upsertUserActivity: db.prepare('INSERT INTO user_activity (user_id, status, track, artist, cover, duration, progress, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET status = excluded.status, track = excluded.track, artist = excluded.artist, cover = excluded.cover, duration = excluded.duration, progress = excluded.progress, updated_at = excluded.updated_at'),
      getUserActivity: db.prepare('SELECT * FROM user_activity WHERE user_id = ?'),
      upsertUserNote: db.prepare('INSERT INTO user_notes (user_id, type, text, audioB64, track, artist, cover, previewUrl, theme, savedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET type = excluded.type, text = excluded.text, audioB64 = excluded.audioB64, track = excluded.track, artist = excluded.artist, cover = excluded.cover, previewUrl = excluded.previewUrl, theme = excluded.theme, savedAt = excluded.savedAt'),
      getUserNote: db.prepare('SELECT * FROM user_notes WHERE user_id = ?'),
      deleteUserNote: db.prepare('DELETE FROM user_notes WHERE user_id = ?'),
      getMessages: db.prepare('SELECT * FROM social_messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY timestamp ASC'),
      insertMessage: db.prepare('INSERT INTO social_messages (sender_id, receiver_id, type, content, track_data, timestamp) VALUES (?, ?, ?, ?, ?, ?)'),
      markRead: db.prepare('UPDATE social_messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?'),
      getUnreadCount: db.prepare('SELECT COUNT(*) as count FROM social_messages WHERE receiver_id = ? AND is_read = 0'),
      likeNote: db.prepare('INSERT INTO note_likes (note_id, liker_id, timestamp) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'),
      unlikeNote: db.prepare('DELETE FROM note_likes WHERE note_id = ? AND liker_id = ?'),
      getNoteLikes: db.prepare('SELECT liker_id FROM note_likes WHERE note_id = ?'),
      insertNoteReply: db.prepare('INSERT INTO note_replies (note_id, user_id, content, timestamp) VALUES (?, ?, ?, ?)'),
      getNoteReplies: db.prepare('SELECT * FROM note_replies WHERE note_id = ? ORDER BY timestamp ASC'),
      getMarketplace: db.prepare('SELECT * FROM marketplace_themes WHERE status = "verified" ORDER BY created_at DESC'),
      getUserInventory: db.prepare('SELECT t.* FROM marketplace_themes t JOIN user_inventory i ON t.id = i.theme_id WHERE i.user_id = ?'),
      getUserBalance: db.prepare('SELECT balance FROM user_balance WHERE user_id = ?'),
      updateBalance: db.prepare('UPDATE user_balance SET balance = balance + ? WHERE user_id = ?'),
      insertInventory: db.prepare('INSERT INTO user_inventory (user_id, theme_id, purchase_date) VALUES (?, ?, ?)'),
      insertTheme: db.prepare('INSERT INTO marketplace_themes (id, creator_id, name, price, css_content, config_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
      verifyTheme: db.prepare('UPDATE marketplace_themes SET status = "verified" WHERE id = ?'),
      incrementSales: db.prepare('UPDATE marketplace_themes SET sales_count = sales_count + 1 WHERE id = ?'),
      initBalance: db.prepare('INSERT OR IGNORE INTO user_balance (user_id, balance) VALUES (?, 100)')
    };
    initialized = true; 
  } catch (error: any) {
    console.error('[Critical] Failed to initialize SQLite database. Auth will be disabled.', error.message);
    db = {
      prepare: () => ({ get: () => null, run: () => null, all: () => [] }),
      exec: () => { },
      transaction: (fn: any) => fn,
    };
    stmts = new Proxy({}, {
      get: () => ({ get: () => null, run: () => null, all: () => [] })
    });
  }
}

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function resolveGoogleRedirectUri(payloadRedirectUri?: string) {
  const fallback = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  if (!payloadRedirectUri) return fallback;

  try {
    const parsed = new URL(payloadRedirectUri);
    const configured = new URL(fallback);
    const isConfiguredFrontend = parsed.origin === configured.origin;
    const isLocalDev = ['localhost', '127.0.0.1'].includes(parsed.hostname);

    if ((isConfiguredFrontend || isLocalDev) && parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      return parsed.origin;
    }
  } catch {
    // Fall through to the configured frontend URL.
  }

  return fallback;
}

export const authController = {
  async googleLogin(params: { access_token?: string; code?: string; redirect_uri?: string }, ip: string) {
    initializeDb();
    let accessToken = params.access_token;

    // If we have a code instead of a token, exchange it
    if (!accessToken && params.code) {
      try {
        console.log(`[Google Auth] Exchanging code: ${params.code.substring(0, 10)}... | CID: ${GOOGLE_CLIENT_ID.substring(0, 10)}...`);
        // redirect_uri must match EXACTLY what was used in the frontend popup
        const redirectUri = resolveGoogleRedirectUri(params.redirect_uri);
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
          code: params.code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }, googleAxiosConfig);
        
        console.log('[Google Auth] Exchange Success. Token types received:', Object.keys(tokenRes.data));
        accessToken = tokenRes.data.access_token;
      } catch (err: any) {
        console.error('[Google Auth] Exchange Error:', err.response?.data || err.message);
        throw err;
      }
    }

    // Fetch user info from Google using the token
    try {
      const googleRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
        ...googleAxiosConfig
      });
      const googleUser = googleRes.data;
      const { email, name, picture } = googleUser;
      
      if (!email) {
        throw new Error('El correo de Google no se encontró');
      }

      const normalizedEmail = email.toLowerCase();
      let user = stmts.getUserByEmail.get(normalizedEmail);
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        // Handle potential name collisions
        let finalName = name;
        let suffix = 1;
        while (stmts.getUserByName.get(finalName)) {
            finalName = `${name}_${suffix}`;
            suffix++;
        }

        // Create new user mapped to Google
        const newId = crypto.randomUUID();
        const svznId = Math.floor(100000 + Math.random() * 900000);
        const hashedPassword = await bcrypt.hash(crypto.randomUUID(), SALT_ROUNDS); // Dummy random password
        // We set a temporary username, but isNewUser=true will trigger onboarding to let them change it
        const initialUsername = (name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 899);
        
        stmts.insertUser.run(newId, svznId, normalizedEmail, hashedPassword, name, initialUsername, picture, Date.now());
        stmts.updateVerification.run(normalizedEmail); // Automatically verified since Google verified it
        user = stmts.getUserById.get(newId);
        if (user) {
          user.isNewUser = true; // Attach flag for the return object
        }
        stmts.logAudit.run(newId, 'SIGNUP_GOOGLE', ip, Date.now(), 'Google OAuth Signup');
      } else {
        // Update existing user's avatar if they don't have one
        if (!user.avatar && picture) {
          db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(picture, user.id);
          user.avatar = picture;
        }
        // Ensure they have a svzn_id
        if (!user.svzn_id) {
          const svznId = Math.floor(100000 + Math.random() * 900000);
          db.prepare("UPDATE users SET svzn_id = ? WHERE id = ?").run(svznId, user.id);
          user.svzn_id = svznId;
        }
        // Ensure they have a username
        if (!user.username) {
          const initialUsername = (name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 899);
          db.prepare("UPDATE users SET username = ? WHERE id = ?").run(initialUsername, user.id);
          user.username = initialUsername;
        }
        user.isNewUser = false;
      }

      const finalUser = user || stmts.getUserByEmail.get(normalizedEmail);
      if (!finalUser) throw new Error('Error al recuperar el usuario tras el login');

      const token = jwt.sign({ id: finalUser.id, email: finalUser.email }, getJWTSecret(), { expiresIn: '365d' });
      const refresh_token = crypto.randomBytes(40).toString('hex');

      stmts.storeRefreshToken.run(refresh_token, finalUser.id, Date.now() + 365 * 24 * 60 * 60 * 1000);
      stmts.logAudit.run(finalUser.id, 'LOGIN_GOOGLE', ip, Date.now(), 'Google OAuth Login');

      return {
        access_token: token,
        refresh_token,
        user: {
          id: finalUser.id,
          svzn_id: finalUser.svzn_id,
          name: finalUser.name,
          email: finalUser.email,
          username: finalUser.username,
          tier: finalUser.tier,
          avatar: finalUser.avatar || picture || null,
          bio: finalUser.bio,
          isNewUser: !!finalUser.isNewUser || isNewUser
        }
      };
    } catch (err: any) {
      console.error('[Google Auth] User Info Error:', err.response?.data || err.message);
      throw err;
    }
  },

  async discordLogin(accessToken: string, ip: string) {
    initializeDb();
    console.log('[Discord Auth] Attempting login with token:', accessToken.substring(0, 10) + '...');
    
    try {
      // Fetch user info from Discord using the token
      const discordRes = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const discordUser = discordRes.data;
      console.log('[Discord Auth] User info received:', discordUser.username);

      const { id, email, username, global_name, avatar } = discordUser;
      
      if (!email) {
        console.error('[Discord Auth] Error: No email in Discord account', discordUser);
        throw new Error('No email found in Discord account. Verify your Discord security settings.');
      }

      const normalizedEmail = email.toLowerCase();
      let user = stmts.getUserByEmail.get(normalizedEmail);
      const name = global_name || username;
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        // ... Handle potential name collisions ...
        let finalName = name;
        let suffix = 1;
        while (stmts.getUserByName.get(finalName)) {
            finalName = `${name}_${suffix}`;
            suffix++;
        }

        // Create new user mapped to Discord
        const newId = crypto.randomUUID();
        const svznId = Math.floor(100000 + Math.random() * 900000);
        const hashedPassword = await bcrypt.hash(crypto.randomUUID(), SALT_ROUNDS); // Dummy random password
        const initialUsername = (username || name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 899);
        const avatarUrl = avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : null;

        stmts.insertUser.run(newId, svznId, normalizedEmail, hashedPassword, name, initialUsername, avatarUrl, Date.now());
        stmts.updateVerification.run(normalizedEmail); // Automatically verified since Discord verified it
        user = stmts.getUserById.get(newId);
        if (user) user.isNewUser = true;
        stmts.logAudit.run(newId, 'SIGNUP_DISCORD', ip, Date.now(), 'Discord OAuth Signup');
      } else {
        // Update existing user's avatar if they don't have one
        const avatarUrl = avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : null;
        if (!user.avatar && avatarUrl) {
          db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(avatarUrl, user.id);
          user.avatar = avatarUrl;
        }
        // Ensure they have a svzn_id
        if (!user.svzn_id) {
          const svznId = Math.floor(100000 + Math.random() * 900000);
          db.prepare("UPDATE users SET svzn_id = ? WHERE id = ?").run(svznId, user.id);
          user.svzn_id = svznId;
        }
        // Ensure they have a username
        if (!user.username) {
          const initialUsername = (username || name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 899);
          db.prepare("UPDATE users SET username = ? WHERE id = ?").run(initialUsername, user.id);
          user.username = initialUsername;
        }
        user.isNewUser = false;
      }

      const finalUser = user || stmts.getUserByEmail.get(normalizedEmail);
      if (!finalUser) throw new Error('Error al recuperar el usuario tras el login');

      const token = jwt.sign({ id: finalUser.id, email: finalUser.email }, getJWTSecret(), { expiresIn: '365d' });
      const refresh_token = crypto.randomBytes(40).toString('hex');

      stmts.storeRefreshToken.run(refresh_token, finalUser.id, Date.now() + 365 * 24 * 60 * 60 * 1000);
      stmts.logAudit.run(finalUser.id, 'LOGIN_DISCORD', ip, Date.now(), 'Discord OAuth Login');

      return {
        access_token: token,
        refresh_token,
        user: {
          id: finalUser.id,
          svzn_id: finalUser.svzn_id,
          name: finalUser.name,
          email: finalUser.email,
          username: finalUser.username,
          tier: finalUser.tier,
          avatar: finalUser.avatar || (avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : null),
          bio: finalUser.bio,
          isNewUser: !!finalUser.isNewUser || isNewUser
        }
      };
    } catch (err: any) {
      console.error('[Discord Auth] Error:', err.response?.data || err.message);
      throw err;
    }
  },

  async signup(emailRaw: string, password: string, name: string, ip: string) {
    initializeDb();
    const email = emailRaw.trim().toLowerCase();
    const existing = stmts.getUserByEmail.get(email);
    if (existing) {
      console.warn(`[Auth] Signup failed: Email ${email} already registered`);
      throw new Error('Email ya registrado');
    }

    const existingName = stmts.getUserByName.get(name);
    if (existingName) {
      console.warn(`[Auth] Signup failed: Username ${name} already in use`);
      throw new Error('El nombre de usuario ya está en uso');
    }

    const nameRegex = /^[a-zA-Z0-9 -]{2,30}$/;
    if (!nameRegex.test(name)) {
      throw new Error('El nombre contiene carácteres no permitidos o es demasiado corto (2-30 carácteres).');
    }

    try {
      const id = crypto.randomUUID();
      const svznId = Math.floor(100000 + Math.random() * 900000);
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const initialUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 899);
      const now = Date.now();

      stmts.insertUser.run(id, svznId, email, hashedPassword, name, initialUsername, null, now);
      console.log(`[Auth] New user registered: ${email} (${id})`);

      const otp = generateOTP();
      stmts.setVerificationCode.run(email, otp, now + 15 * 60 * 1000);
      const emailSent = await mailer.sendVerificationEmail(email, otp);
      console.log(`[Auth] Verification code ${emailSent ? 'sent' : 'FAILED'} to ${email}`);

      stmts.logAudit.run(id, 'SIGNUP', ip, now, 'User registered');
      // Always return the code so the UI can display it directly if email is unavailable
      return { success: true, dev_code: otp };
    } catch (error: any) {
      console.error(`[Security] CRITICAL: Signup error for ${email}:`, error.message, error.stack);
      throw new Error(`Error interno en el registro: ${error.message}`);
    }
  },

  async verifyCode(emailRaw: string, code: string, ip: string) {
    initializeDb();
    const email = emailRaw.trim().toLowerCase();
    const record = stmts.getVerificationCode.get(email);
    if (!record || record.code !== code || Date.now() > record.expires_at) {
      throw new Error('Invalid or expired code');
    }
    stmts.updateVerification.run(email);
    stmts.deleteVerificationCode.run(email);
    const user = stmts.getUserByEmail.get(email);
    if (user) {
      stmts.logAudit.run(user.id, 'VERIFY', ip, Date.now(), 'Email verified');
      mailer.sendWelcomeEmail(email, user.name).catch(console.error);
    }
    return { success: true };
  },

  async resendVerificationCode(emailRaw: string, ip: string) {
    initializeDb();
    const email = emailRaw.trim().toLowerCase();
    const user = stmts.getUserByEmail.get(email);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.verified) {
      throw new Error('Account already verified');
    }
    const otp = generateOTP();
    stmts.setVerificationCode.run(email, otp, Date.now() + 15 * 60 * 1000);
    const emailSent = await mailer.sendVerificationEmail(email, otp);
    stmts.logAudit.run(user.id, 'RESEND_VERIFY', ip, Date.now(), 'Verification code resent');
    return { success: true, dev_code: emailSent ? undefined : otp };
  },

  async login(emailRaw: string, password: string, ip: string) {
    initializeDb();
    const email = emailRaw.trim().toLowerCase();
    // BUG FIX (Arquitectura 9.4): Rate Limiting
    const limit = stmts.getRateLimit.get(ip);
    if (limit && Date.now() < limit.lockout_until) {
      const remainingSeconds = Math.ceil((limit.lockout_until - Date.now()) / 1000);
      throw new Error(`Demasiados intentos. Bloqueado temporalmente. Intenta en ${remainingSeconds}s.`);
    }

    const user = stmts.getUserByEmail.get(email);
    const isMatch = user && (await bcrypt.compare(password, user.password_hash));

    if (!isMatch) {
      if (!user) {
        console.warn(`[Auth] Login failed: User not found for ${email}`);
      } else {
        console.warn(`[Auth] Login failed: Password mismatch for ${email}`);
      }
      const attempts = (limit?.attempts || 0) + 1;
      const lockoutUnit = attempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0; // 15 min lockout
      stmts.upsertRateLimit.run(ip, attempts, lockoutUnit);

      stmts.logAudit.run(user?.id || 'unknown', 'LOGIN_FAIL', ip, Date.now(), `Failed attempt ${attempts}`);
      throw new Error('Credenciales inválidas');
    }

    // Success: Reset limits
    stmts.resetRateLimit.run(ip);

    if (!user.verified) {
      throw new Error('Cuenta NO_VERIFICADA');
    }

    const token = jwt.sign({ id: user.id, email: user.email }, getJWTSecret(), { expiresIn: '365d' });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    stmts.storeRefreshToken.run(refreshToken, user.id, Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days

    stmts.logAudit.run(user.id, 'LOGIN', ip, Date.now(), 'User logged in');
    return {
      access_token: token,
      refresh_token: refreshToken,
      user: { 
        id: user.id, 
        svzn_id: user.svzn_id,
        email: user.email, 
        name: user.name, 
        username: user.username,
        tier: user.tier,
        avatar: user.avatar,
        bio: user.bio,
        isNewUser: !user.username || user.username.includes('_')
      }
    };
  },

  async refreshAuthToken(refreshToken: string) {
    initializeDb();
    const record = stmts.getRefreshToken.get(refreshToken);
    if (!record || Date.now() > record.expires_at) {
      throw new Error('Invalid refresh token');
    }
    const user = stmts.getUserById.get(record.user_id);
    if (!user) throw new Error('User not found');

    const newToken = jwt.sign({ id: user.id, email: user.email }, getJWTSecret(), { expiresIn: '365d' });
    return { access_token: newToken };
  },

  verifyAccessToken(token: string) {
    initializeDb();
    try {
      return jwt.verify(token, getJWTSecret());
    } catch {
      return null;
    }
  },

  getFullUser(id: string) {
    initializeDb();
    const user = stmts.getUserById.get(id);
    if (!user) return null;
    return {
      id: user.id,
      svzn_id: user.svzn_id,
      email: user.email,
      name: user.name,
      username: user.username,
      tier: user.tier,
      avatar: user.avatar,
      bio: user.bio,
      isNewUser: !user.username || user.username.includes('_')
    };
  },

  async requestPasswordReset(emailRaw: string, ip: string) {
    initializeDb();
    const email = emailRaw.trim().toLowerCase();
    const user = stmts.getUserByEmail.get(email);
    if (!user) return { success: true }; // Silent fail
    const otp = generateOTP();
    stmts.setVerificationCode.run(email, otp, Date.now() + 15 * 60 * 1000);
    const emailSent = await mailer.sendResetEmail(email, otp);
    console.log(`[Auth] Password reset OTP ${emailSent ? 'sent' : 'FAILED'} to ${email}`);
    stmts.logAudit.run(user.id, 'RESET_REQ', ip, Date.now(), 'Password reset requested');
    return { success: true, dev_code: emailSent ? undefined : otp };
  },

  async resetPasswordWithOTP(emailRaw: string, code: string, newPass: string, ip: string) {
    initializeDb();
    const email = emailRaw.trim().toLowerCase();
    const record = stmts.getVerificationCode.get(email);
    if (!record || record.code !== code || Date.now() > record.expires_at) {
      throw new Error('Invalid code');
    }
    const hashedPassword = await bcrypt.hash(newPass, SALT_ROUNDS);
    stmts.updatePassword.run(hashedPassword, email);
    stmts.deleteVerificationCode.run(email);
    const user = stmts.getUserByEmail.get(email);
    if (user) stmts.logAudit.run(user.id, 'RESET_DONE', ip, Date.now(), 'Password changed');
  },

  async updateProfile(userId: string, data: { name?: string; username?: string; avatar?: string; bio?: string; genres?: string[] }) {
    initializeDb();
    if (data.username) {
      const existing = stmts.getUserByUsername.get(data.username.toLowerCase());
      if (existing && existing.id !== userId) {
        throw new Error('El nombre de usuario ya está en uso');
      }
    }
    stmts.updateProfile.run(data.name || null, data.username || null, data.avatar || null, data.bio || null, userId);
  },

  getSecurityDashboard(userId: string) {
    initializeDb();
    const user = stmts.getUserById.get(userId);
    return { security_score: user ? user.security_score : 0 };
  },

  getAuditLogs(userId: string) {
    initializeDb();
    return stmts.getAuditLogs.all(userId);
  },

  logPlayback(userId: string | null, data: { trackId: string, trackName: string, artist: string, album?: string, coverUrl?: string, durationMs?: number, source?: string, completed?: number }) {
    initializeDb();
    const now = Date.now();
    const id = crypto.randomUUID();
    try {
      stmts.logPlayback.run(
        id,
        userId || 'anonymous',
        data.trackId,
        data.trackName,
        data.artist,
        data.album || null,
        data.coverUrl || null,
        data.durationMs || 0,
        now,
        data.source || 'spotify',
        data.completed || 0
      );
      return true;
    } catch (err) {
      console.error('[Auth] Error logging playback:', err);
      return false;
    }
  },

  getStats(userId: string | null) {
    initializeDb();
    const targetId = userId || 'anonymous';
    try {
      const stats = stmts.getStats.get(targetId, targetId, targetId, targetId);
      const weekly = stmts.getWeeklyActivity.all(targetId, Date.now() - 7 * 24 * 60 * 60 * 1000);
      const topTracks = stmts.getTopTracks.all(targetId);

      return {
        ...stats,
        weekly,
        topTracks
      };
    } catch (err) {
      console.error('[Auth] Error getting stats:', err);
      return null;
    }
  },

  getGlobalRanking() {
    initializeDb();
    try {
      const query = db.prepare(`
        SELECT u.id, u.name, u.tier, 
               COALESCE(SUM(p.duration_ms) / 60000.0, 0) as totalMinutes
        FROM users u
        JOIN play_history p ON p.user_id = u.id
        GROUP BY u.id
        ORDER BY totalMinutes DESC
        LIMIT 10
      `);
      return query.all();
    } catch (err) {
      console.error('[Stats] Error global ranking:', err);
      return [];
    }
  },

  getFriendsRanking(userId: string) {
    initializeDb();
    try {
      const query = db.prepare(`
        SELECT u.id, u.name, u.tier, 
               COALESCE(SUM(p.duration_ms) / 60000.0, 0) as totalMinutes
        FROM users u
        JOIN play_history p ON p.user_id = u.id
        WHERE u.id = ? 
           OR u.id IN (SELECT friend_id FROM friends WHERE user_id = ? AND status = 'accepted')
        GROUP BY u.id
        ORDER BY totalMinutes DESC
        LIMIT 10
      `);
      return query.all(userId, userId);
    } catch (err) {
      console.error('[Stats] Error friends ranking:', err);
      return [];
    }
  },

  getPreferences(userId: string) {
    initializeDb();
    try {
      return stmts.getPreferences.get(userId);
    } catch (err) {
      console.error('[Auth] Error getting preferences:', err);
      return null;
    }
  },

  updatePreferences(userId: string, data: { crossfade_seconds?: number, audio_quality?: string, discover_mode?: number, volume?: number, repeat_mode?: string, shuffle?: number }) {
    initializeDb();
    try {
      const now = Date.now();
      stmts.upsertPreferences.run(
        userId,
        data.crossfade_seconds ?? 0,
        data.audio_quality ?? 'standard',
        data.discover_mode ?? 0,
        data.volume ?? 0.8,
        data.repeat_mode ?? 'none',
        data.shuffle ?? 0,
        now
      );
      return true;
    } catch (err) {
      console.error('[Auth] Error updating preferences:', err);
      return false;
    }
  },

  getLyrics(artist: string, title: string) {
    initializeDb();
    try {
      // Primary search by hash to avoid collisions
      const id = crypto.createHash('md5').update(`${artist.toLowerCase()}_${title.toLowerCase()}`).digest('hex');
      let lyrics = stmts.getLyricsByHash.get(id);

      if (!lyrics) {
        // Fallback to name search
        lyrics = stmts.getLyricsByName.get(artist, title);
      }
      return lyrics;
    } catch (err) {
      console.error('[Auth] Error getting lyrics:', err);
      return null;
    }
  },

  setLyrics(artist: string, title: string, lyricsData: { lrc_synced?: string, plain_text?: string, source?: string }) {
    initializeDb();
    const now = Date.now();
    const id = crypto.createHash('md5').update(`${artist.toLowerCase()}_${title.toLowerCase()}`).digest('hex');
    try {
      stmts.setLyrics.run(
        id,
        title,
        artist,
        lyricsData.lrc_synced || null,
        lyricsData.plain_text || null,
        lyricsData.source || 'lrclib',
        now
      );
      return true;
    } catch (err) {
      console.error('[Auth] Error setting lyrics:', err);
      return false;
    }
  },
  getContinueListening(userId: string | null) {
    initializeDb();
    const targetId = userId || 'anonymous';
    try {
      return stmts.getContinueListening.all(targetId);
    } catch (err) {
      console.error('[Auth] Error getting continue listening:', err);
      return [];
    }
  },
  getHistory(userId: string | null) {
    initializeDb();
    const targetId = userId || 'anonymous';
    try {
      return stmts.getHistory.all(targetId);
    } catch (err) {
      console.error('[Auth] Error getting history:', err);
      return [];
    }
  },

  // ─── Social Controller Logic ───
  social: {
    getFriendsPool(userId: string) {
      initializeDb();
      try {
        const friendIdsObj = stmts.getFriendsIds.all(userId);
        const results = [];
        
        for (const row of friendIdsObj) {
          const fid = row.friend_id;
          const friendData = stmts.getUserById.get(fid);
          if (!friendData) continue;

          // Hydrate with activity
          const activity = stmts.getUserActivity.get(fid);
          // Hydrate with notes (Discard if older than 24h)
          const noteRaw = stmts.getUserNote.get(fid);
          let note = undefined;
          
          if (noteRaw && (Date.now() - noteRaw.savedAt) < 24 * 60 * 60 * 1000) {
              note = {
                  type: noteRaw.type,
                  text: noteRaw.text,
                  audioB64: noteRaw.audioB64,
                  track: noteRaw.track,
                  artist: noteRaw.artist,
                  cover: noteRaw.cover,
                  previewUrl: noteRaw.previewUrl,
                  theme: noteRaw.theme,
                  savedAt: noteRaw.savedAt
              };
          }

          // Hydrate with unread count
          const unread = stmts.getUnreadCount.get(userId, fid)?.count || 0;

          results.push({
            id: friendData.id,
            svzn_id: friendData.svzn_id,
            username: friendData.username || friendData.name.toLowerCase().replace(/\s+/g, ''),
            name: friendData.name,
            avatar: friendData.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(friendData.name)}`,
            status: activity ? activity.status : 'offline',
            is_pinned: row.is_pinned === 1,
            unreadCount: unread,
            activity: activity && activity.track ? {
              track: activity.track, artist: activity.artist, cover: activity.cover,
              duration: activity.duration, progress: activity.progress
            } : undefined,
            note
          });
        }
        return results;
      } catch(err) {
        console.error('[Social] Error fetch friends:', err);
        return [];
      }
    },
    
    addFriendByTarget(userId: string, targetStr: string) {
       initializeDb();
       try {
         console.log(`[Social] Add friend request from ${userId} to ${targetStr}`);
         // Search by exact alias/name, email or ID
         const targetUser = stmts.getUserByName.get(targetStr) || 
                            stmts.getUserByEmail.get(targetStr) || 
                            stmts.getUserByUsername.get(targetStr.replace('@', '')) ||
                            stmts.getUserBySvznId.get(parseInt(targetStr)) ||
                            stmts.getUserById.get(targetStr);
         if (!targetUser) {
            console.warn(`[Social] Target user not found for query: ${targetStr}`);
            return false;
         }
         if (targetUser.id === userId) {
            console.warn(`[Social] User ${userId} tried to add themselves.`);
            return false;
         }
         
         const now = Date.now();
         stmts.addFriend.run(userId, targetUser.id, 'pending', now);
         console.log(`[Social] Request created: ${userId} -> ${targetUser.id} (pending)`);
         return targetUser;
       } catch(err) {
         console.error('[Social] Add friend error:', err);
         return false;
       }
    },

    getPendingRequests(userId: string) {
        initializeDb();
        try {
            const rows = stmts.getPendingRequests.all(userId);
            const requests = [];
            for (const row of rows) {
                const u = stmts.getUserById.get(row.sender_id);
                if (u) {
                    requests.push({
                        id: u.id,
                        svzn_id: u.svzn_id,
                        name: u.name,
                        username: u.username || u.name.toLowerCase().replace(/\s+/g, ''),
                        avatar: u.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(u.name)}`
                    });
                }
            }
            return requests;
        } catch(e) { return []; }
    },
    
    respondRequest(userId: string, senderId: string, accept: boolean) {
        initializeDb();
        try {
            if (accept) {
                const now = Date.now();
                stmts.addFriend.run(senderId, userId, 'accepted', now); // sender -> me
                stmts.addFriend.run(userId, senderId, 'accepted', now); // me -> sender
            } else {
                stmts.removeFriend.run(senderId, userId);
            }
            return true;
        } catch(e) { return false; }
    },

    checkUsernameExists(username: string) {
        initializeDb();
        try {
            const row = stmts.getUserByUsername.get(username.toLowerCase());
            return !!row;
        } catch { return false; }
    },

    searchUsers(query: string) {
        initializeDb();
        try {
            console.log(`[Social] Searching users with query: ${query}`);
            const rows = stmts.searchUsers.all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
            console.log(`[Social] Found ${rows.length} users`);
            return rows.map((u: any) => ({
                id: u.id,
                svzn_id: u.svzn_id,
                name: u.name,
                username: u.username || u.name.toLowerCase().replace(/\s+/g, ''),
                avatar: u.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(u.name)}`
            }));
        } catch(e) { 
            console.error('[Social] Search error:', e);
            return []; 
        }
    },

    removeFriend(userId: string, friendId: string) {
       initializeDb();
       stmts.removeFriend.run(userId, friendId);
       stmts.removeFriend.run(friendId, userId);
       return true;
    },

    togglePin(userId: string, friendId: string) {
       initializeDb();
       try {
         stmts.togglePin.run(userId, friendId);
         return true;
       } catch(err) { return false; }
    },

    clearChat(userId: string, friendId: string) {
       initializeDb();
       try {
         stmts.clearFriendMessages.run(userId, friendId, friendId, userId);
         return true;
       } catch(err) { return false; }
    },

    updateActivity(userId: string, payload: any) {
      initializeDb();
      try {
        stmts.upsertUserActivity.run(
          userId,
          payload.status || 'online',
          payload.track || null,
          payload.artist || null,
          payload.cover || null,
          payload.duration || 0,
          payload.progress || 0,
          Date.now()
        );
        return true;
      } catch(err) { return false; }
    },

    saveNote(userId: string, note: any) {
      initializeDb();
      try {
        stmts.upsertUserNote.run(
            userId,
            note.type,
            note.text || null,
            note.audioB64 || null,
            note.track || null,
            note.artist || null,
            note.cover || null,
            note.previewUrl || null,
            note.theme || 'default',
            note.savedAt || Date.now()
        );
        return true;
      } catch(err) { return false; }
    },

    deleteNote(userId: string) {
       initializeDb();
       stmts.deleteUserNote.run(userId);
       return true;
    },

    // ─── Messaging & Chat ───
    getChat(userId: string, friendId: string) {
      initializeDb();
      try {
        const msgs = stmts.getMessages.all(userId, friendId, friendId, userId);
        stmts.markRead.run(userId, friendId); // Mark as read when fetching
        return msgs.map((m: any) => ({
          ...m,
          track_data: m.track_data ? JSON.parse(m.track_data) : null
        }));
      } catch (err) { return []; }
    },

    sendMessage(userId: string, targetId: string, type: string, content: string, trackData?: any) {
       initializeDb();
       try {
         stmts.insertMessage.run(
           userId, targetId, type, content, 
           trackData ? JSON.stringify(trackData) : null, 
           Date.now()
         );
         return true;
       } catch (err) { return false; }
    },

    getGlobalUnread(userId: string) {
      initializeDb();
      return stmts.getUnreadCount.get(userId)?.count || 0;
    },

    // ─── Note Interactions ───
    toggleLike(userId: string, noteId: string) {
      initializeDb();
      try {
        const existing = stmts.getNoteLikes.all(noteId);
        const isLiked = existing.some((l: any) => l.liker_id === userId);
        if (isLiked) {
          stmts.unlikeNote.run(noteId, userId);
          return { liked: false };
        } else {
          stmts.likeNote.run(noteId, userId, Date.now());
          return { liked: true };
        }
      } catch (err) { return { error: true }; }
    },

    getNoteInteractions(noteId: string) {
      initializeDb();
      try {
        const likes = stmts.getNoteLikes.all(noteId);
        const replies = stmts.getNoteReplies.all(noteId);
        
        // Hydrate liker profiles (minimal)
        const likers = likes.map((l: any) => {
          const u = stmts.getUserById.get(l.liker_id);
          return u ? { id: u.id, name: u.name, avatar: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(u.name)}` } : null;
        }).filter(Boolean);

        // Hydrate replier profiles
        const hydratedReplies = replies.map((r: any) => {
          const u = stmts.getUserById.get(r.user_id);
          return {
            ...r,
            user: u ? { name: u.name, avatar: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(u.name)}` } : { name: 'Desconocido' }
          };
        });

        return { likers, replies: hydratedReplies };
      } catch (err) { return { likers: [], replies: [] }; }
    },

    replyNote(userId: string, noteId: string, text: string) {
      initializeDb();
      try {
        stmts.insertNoteReply.run(noteId, userId, text, Date.now());
        return true;
      } catch (err) { return false; }
    }
  },

  // ─── Marketplace & Canvas Studio Logic ───
  marketplace: {
    getThemes() {
       initializeDb();
       try {
         return stmts.getMarketplace.all();
       } catch (err) { return []; }
    },

    getUserInventory(userId: string) {
       initializeDb();
       try {
         return stmts.getUserInventory.all(userId);
       } catch (err) { return []; }
    },

    getBalance(userId: string) {
       initializeDb();
       try {
         const row = stmts.getUserBalance.get(userId);
         return row ? row.balance : 0;
       } catch (err) { return 0; }
    },

    async buyTheme(userId: string, themeId: string) {
       initializeDb();
       const theme = db.prepare('SELECT * FROM marketplace_themes WHERE id = ?').get(themeId);
       if (!theme) throw new Error('Tema no encontrado');
       if (theme.status !== 'verified') throw new Error('Tema no verificado');

       const userBalance = stmts.getUserBalance.get(userId)?.balance || 0;
       if (userBalance < theme.price) throw new Error('Saldo insuficiente (SoundCredits)');

       // Check if already owned
       const existing = db.prepare('SELECT * FROM user_inventory WHERE user_id = ? AND theme_id = ?').get(userId, themeId);
       if (existing) throw new Error('Ya posees este tema');

       const transaction = db.transaction(() => {
          // 1. Deduct price from buyer
          stmts.updateBalance.run(-theme.price, userId);

          // 2. Add 70% to creator
          const creatorShare = Math.floor(theme.price * 0.7);
          stmts.updateBalance.run(creatorShare, theme.creator_id);

          // 3. Add to inventory
          stmts.insertInventory.run(userId, themeId, Date.now());

          // 4. Increment stats
          stmts.incrementSales.run(themeId);
       });

       try {
         transaction();
         return { success: true, newBalance: userBalance - theme.price };
       } catch (err) {
         console.error('[Marketplace] Purchase error:', err);
         throw err;
       }
    },

    publishTheme(userId: string, themeData: any) {
       initializeDb();
       try {
         const id = `theme_${crypto.randomBytes(4).toString('hex')}`;
         stmts.insertTheme.run(
           id,
           userId,
           themeData.name,
           themeData.price || 0,
           themeData.css_content || '',
           JSON.stringify(themeData.config || {}),
           'pending', // Starts as pending for "Verificador"
           Date.now()
         );

         // Simulate auto-verification for prototype (In production this would be manual/scripted)
         setTimeout(() => {
           stmts.verifyTheme.run(id);
           console.log(`[Marketplace] Theme ${id} auto-verified for prototype.`);
         }, 5000);

         return { success: true, themeId: id };
       } catch (err) {
         console.error('[Marketplace] Publish error:', err);
         return { success: false };
       }
    }
  }
};
