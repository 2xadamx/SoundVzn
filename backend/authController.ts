import { userRepository } from './db/UserRepository.js';
import { authService } from './services/AuthService.js';
import { socialService } from './services/SocialService.js';
import { SessionGuard } from './utils/sessionGuard.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import https from 'node:https';
import axios from 'axios';
import { db } from './db/index.js';
import { mailer } from './mailer.js';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET } from './secrets.js';
import { Sanitizer } from './utils/sanitizer.js';

const SALT_ROUNDS = 12;
const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
const googleAxiosConfig = process.env.NODE_ENV === 'production'
    ? {}
    : { httpsAgent: new https.Agent({ rejectUnauthorized: false }) };

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

export class AuthController {
    private secret = JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_only_soundvzn_secret_change_me');
    public social = socialService;

    constructor() {
        if (!this.secret) {
            throw new Error('JWT_SECRET is required in production');
        }
    }

    /**
     * Standard Login
     */
    public async login(req: any, res: any) {
        const { email, password } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

        try {
            const { user, token } = await authService.login(email, password, ip as string);
            const refreshToken = crypto.randomBytes(40).toString('hex');
            db.prepare('INSERT INTO refresh_tokens (token, user_id, ip_address, expires_at) VALUES (?, ?, ?, ?)')
                .run(refreshToken, user.id, ip, Date.now() + ONE_YEAR);
            
            // REINFORCEMENT: Secure Cookie Session (Enterprise Grade)
            SessionGuard.setSession(res, token);

            return res.json({ 
                access_token: token,
                refresh_token: refreshToken,
                user: {
                    id: user.id,
                    svzn_id: user.svzn_id,
                    email: user.email,
                    name: user.name,
                    tier: user.tier,
                    username: user.username,
                    avatar: user.avatar,
                    bio: user.bio,
                    isNewUser: false
                }
            });
        } catch (error: any) {
            if (error.message === 'ACCOUNT_NOT_VERIFIED') {
                return res.status(403).json({ error: 'ACCOUNT_NOT_VERIFIED' });
            }
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
    }
    
    /**
     * Logout (Clear Cookie)
     */
    public async logout(req: any, res: any) {
        SessionGuard.clearSession(res);
        return res.json({ success: true });
    }

    /**
     * Register
     */
    public async register(req: any, res: any) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        try {
            const user = await authService.register(req.body, ip as string);
            return res.status(201).json({ success: true, userId: user.id });
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    /**
     * Verify Token (Middleware helper)
     */
    public verifyAccessToken(token: string) {
        try {
            return jwt.verify(token, this.secret);
        } catch {
            return null;
        }
    }

    /**
     * Get Current User Profile
     */
    public async me(req: any, res: any) {
        try {
            const user = userRepository.findById(req.user.id);
            if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
            
            let anthem = null;
            if (user.anthem) {
                try {
                    anthem = JSON.parse(user.anthem);
                } catch (e) {
                    console.error(`[AuthController] Failed to parse anthem for user ${user.id}:`, e);
                }
            }

            return res.json({
                user: {
                    id: user.id,
                    svzn_id: user.svzn_id,
                    email: user.email,
                    name: user.name,
                    tier: user.tier,
                    username: user.username,
                    avatar: user.avatar,
                    banner: user.banner,
                    bio: user.bio,
                    anthem: anthem,
                    verified: !!user.verified
                }
            });
        } catch (err: any) {
            console.error('[AuthController] Error in /me:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    public async googleLogin(payload: any, ip: string) {
        let accessToken = payload.access_token;
        try {
            if (!accessToken && payload.code) {
                // redirect_uri must match exactly what the frontend used when opening the OAuth popup.
                const redirectUri = resolveGoogleRedirectUri(payload.redirect_uri);
                console.log(`[Google Auth] Exchanging code. RedirectURI: ${redirectUri}, ClientID: ${GOOGLE_CLIENT_ID?.substring(0, 20)}...`);
                
                const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
                    code: payload.code,
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                }, googleAxiosConfig);
                accessToken = tokenRes.data.access_token;
            }

            if (!accessToken) throw new Error('No access token received from Google');

            const googleRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
                ...googleAxiosConfig,
            });
            const { email, name, picture } = googleRes.data;
            if (!email) throw new Error('Google account has no email');
            
            return this.oauthLogin(email, name || email.split('@')[0], picture || null, ip, 'GOOGLE');
        } catch (error: any) {
            const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            console.error(`[Google Auth] Critical failure: ${details}`);
            console.error(`[Google Auth] Client ID used: ${GOOGLE_CLIENT_ID?.substring(0, 30)}...`);
            console.error(`[Google Auth] Secret present: ${!!GOOGLE_CLIENT_SECRET}`);
            throw new Error(`Google Auth failed: ${details}`);
        }
    }

    public async discordLogin(token: string, ip: string) {
        const discordRes = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const { id, email, username, global_name, avatar } = discordRes.data;
        if (!email) throw new Error('Discord account has no email');
        const avatarUrl = avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : null;
        return this.oauthLogin(email, global_name || username || email.split('@')[0], avatarUrl, ip, 'DISCORD');
    }

    public async signup(emailRaw: string, password: string, name: string, username: string, ip: string) {
        const email = emailRaw.trim().toLowerCase();
        const cleanName = Sanitizer.clean(name).substring(0, 30);
        const cleanUsername = Sanitizer.cleanUsername(username || cleanName);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email invalido');
        if (!cleanName || cleanName.length < 2) throw new Error('Nombre invalido (minimo 2 caracteres)');
        if (!password || password.length < 8) throw new Error('La contrasena debe tener al menos 8 caracteres');
        if (userRepository.findByEmail(email)) throw new Error('Email ya registrado');
        if (cleanUsername && userRepository.findByUsername(cleanUsername)) throw new Error('El nombre de usuario ya esta en uso');

        const id = crypto.randomUUID();
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        db.prepare(`
            INSERT INTO users (id, email, password_hash, name, username, tier, verified, created_at)
            VALUES (?, ?, ?, ?, ?, 'standard', 0, ?)
        `).run(id, email, passwordHash, cleanName, cleanUsername, Date.now());
        db.prepare('INSERT OR IGNORE INTO user_balance (user_id, balance) VALUES (?, 100)').run(id);

        const otp = generateOTP();
        db.prepare(`
            INSERT INTO verification_codes (email, code, expires_at)
            VALUES (?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, failed_attempts = 0
        `).run(email, otp, Date.now() + 15 * 60 * 1000);
        const sent = await mailer.sendVerificationEmail(email, otp);
        this.audit(id, 'SIGNUP', ip, 'User registered');
        return { success: true, dev_code: sent ? undefined : otp };
    }

    public async verifyCode(emailRaw: string, code: string, ip: string) {
        const email = emailRaw.trim().toLowerCase();
        const record = db.prepare('SELECT * FROM verification_codes WHERE email = ?').get(email) as any;
        if (!record || record.code !== code || Date.now() > record.expires_at) throw new Error('Codigo invalido o expirado');
        db.prepare('UPDATE users SET verified = 1, security_score = security_score + 25 WHERE email = ?').run(email);
        db.prepare('DELETE FROM verification_codes WHERE email = ?').run(email);
        const user = userRepository.findByEmail(email);
        if (user) {
            this.audit(user.id, 'VERIFY', ip, 'Email verified');
            mailer.sendWelcomeEmail(email, user.name).catch(() => {});
        }
        return { success: true };
    }

    public async resendVerificationCode(emailRaw: string, ip: string) {
        const email = emailRaw.trim().toLowerCase();
        const user = userRepository.findByEmail(email);
        if (!user) throw new Error('Usuario no encontrado');
        if (user.verified) throw new Error('La cuenta ya esta verificada');
        const otp = generateOTP();
        db.prepare(`
            INSERT INTO verification_codes (email, code, expires_at)
            VALUES (?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, failed_attempts = 0
        `).run(email, otp, Date.now() + 15 * 60 * 1000);
        const sent = await mailer.sendVerificationEmail(email, otp);
        this.audit(user.id, 'RESEND_VERIFY', ip, 'Verification code resent');
        return { success: true, dev_code: sent ? undefined : otp };
    }

    public async refreshAuthToken(refreshToken: string) {
        const record = db.prepare(
            'SELECT * FROM refresh_tokens WHERE token = ? AND (revoked = 0 OR revoked IS NULL)'
        ).get(refreshToken) as any;
        if (!record || Date.now() > record.expires_at) throw new Error('Invalid refresh token');
        const user = userRepository.findById(record.user_id);
        if (!user) throw new Error('User not found');
        return { access_token: this.generateToken(user), user: this.publicUser(user) };
    }

    /** Dev-only: re-emite tokens para un usuario existente (sesión local desincronizada). */
    public restoreDevSession(emailRaw: string, ip: string) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Not available');
        }
        const email = emailRaw.trim().toLowerCase();
        const user = userRepository.findByEmail(email);
        if (!user) throw new Error('Usuario no encontrado');
        const accessToken = this.generateToken(user);
        const refreshToken = crypto.randomBytes(40).toString('hex');
        db.prepare('INSERT INTO refresh_tokens (token, user_id, ip_address, expires_at) VALUES (?, ?, ?, ?)')
            .run(refreshToken, user.id, ip, Date.now() + ONE_YEAR);
        this.audit(user.id, 'DEV_RESTORE', ip, 'Dev session restored');
        return { access_token: accessToken, refresh_token: refreshToken, user: this.publicUser(user) };
    }

    public async requestPasswordReset(emailRaw: string, ip: string) {
        const email = emailRaw.trim().toLowerCase();
        const user = userRepository.findByEmail(email);
        if (!user) return { success: true };
        const otp = generateOTP();
        db.prepare(`
            INSERT INTO verification_codes (email, code, expires_at)
            VALUES (?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, failed_attempts = 0
        `).run(email, otp, Date.now() + 15 * 60 * 1000);
        const sent = await mailer.sendResetEmail(email, otp);
        this.audit(user.id, 'RESET_REQUEST', ip, 'Password reset requested');
        return { success: true, dev_code: sent ? undefined : otp };
    }

    public async resetPasswordWithOTP(emailRaw: string, code: string, newPassword: string, ip: string) {
        const email = emailRaw.trim().toLowerCase();
        const record = db.prepare('SELECT * FROM verification_codes WHERE email = ?').get(email) as any;
        if (!record || record.code !== code || Date.now() > record.expires_at) throw new Error('Codigo invalido o expirado');
        if (!newPassword || newPassword.length < 8) throw new Error('La contrasena debe tener al menos 8 caracteres');
        const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, email);
        db.prepare('DELETE FROM verification_codes WHERE email = ?').run(email);
        const user = userRepository.findByEmail(email);
        if (user) this.audit(user.id, 'RESET_PASSWORD', ip, 'Password changed');
        return { success: true };
    }

    public async updateProfile(userId: string, data: { name?: string; username?: string; avatar?: string; banner?: string; bio?: string; genres?: string[]; anthem?: any }) {
        const username = data.username ? Sanitizer.cleanUsername(data.username) : null;
        if (username) {
            const existing = userRepository.findByUsername(username);
            if (existing && existing.id !== userId) throw new Error('El nombre de usuario ya esta en uso');
        }
        db.prepare(`
            UPDATE users
            SET name = COALESCE(?, name),
                username = COALESCE(?, username),
                avatar = COALESCE(?, avatar),
                banner = COALESCE(?, banner),
                bio = COALESCE(?, bio),
                genres = COALESCE(?, genres),
                anthem = COALESCE(?, anthem)
            WHERE id = ?
        `).run(
            data.name ? Sanitizer.clean(data.name).substring(0, 30) : null,
            username,
            data.avatar || null,
            data.banner || null,
            data.bio ? Sanitizer.clean(data.bio).substring(0, 300) : null,
            data.genres ? JSON.stringify(data.genres.slice(0, 12)) : null,
            data.anthem ? JSON.stringify(data.anthem) : null,
            userId
        );
        return userRepository.findById(userId);
    }

    public getUserStats(userId: string) {
        return db.prepare(`
            SELECT
                (SELECT COUNT(DISTINCT track_id) FROM play_history WHERE user_id = ?) as totalTracks,
                (SELECT COALESCE(SUM(duration_ms), 0) / 60000.0 FROM play_history WHERE user_id = ?) as totalMinutes,
                (SELECT artist FROM play_history WHERE user_id = ? GROUP BY artist ORDER BY COUNT(*) DESC LIMIT 1) as topArtist,
                (SELECT track_name FROM play_history WHERE user_id = ? GROUP BY track_name ORDER BY COUNT(*) DESC LIMIT 1) as mostPlayed
        `).get(userId, userId, userId, userId);
    }

    private async oauthLogin(emailRaw: string, nameRaw: string, avatar: string | null, ip: string, provider: string) {
        const email = emailRaw.trim().toLowerCase();
        let user = userRepository.findByEmail(email) as any;
        let isNewUser = false;
        if (!user) {
            const id = crypto.randomUUID();
            const baseUsername = Sanitizer.cleanUsername(nameRaw) || email.split('@')[0];
            let username = baseUsername;
            let suffix = 1;
            while (username && userRepository.findByUsername(username)) username = `${baseUsername}${suffix++}`;
            db.prepare(`
                INSERT INTO users (id, email, password_hash, name, username, tier, verified, avatar, created_at)
                VALUES (?, ?, ?, ?, ?, 'standard', 1, ?, ?)
            `).run(id, email, await bcrypt.hash(crypto.randomUUID(), SALT_ROUNDS), Sanitizer.clean(nameRaw), username, avatar, Date.now());
            db.prepare('INSERT OR IGNORE INTO user_balance (user_id, balance) VALUES (?, 100)').run(id);
            user = userRepository.findById(id);
            isNewUser = true;
            this.audit(id, `SIGNUP_${provider}`, ip, `${provider} OAuth signup`);
        } else if (avatar && !user.avatar) {
            db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, user.id);
            user.avatar = avatar;
        }
        const accessToken = this.generateToken(user);
        const refreshToken = crypto.randomBytes(40).toString('hex');
        db.prepare('INSERT INTO refresh_tokens (token, user_id, ip_address, expires_at) VALUES (?, ?, ?, ?)')
            .run(refreshToken, user.id, ip, Date.now() + ONE_YEAR);
        this.audit(user.id, `LOGIN_${provider}`, ip, `${provider} OAuth login`);
        return { access_token: accessToken, refresh_token: refreshToken, user: { ...this.publicUser(user), isNewUser } };
    }

    private generateToken(user: any) {
        // Keep token small — only include essential fields
        return jwt.sign(
            { 
                id: user.id, 
                svzn_id: user.svzn_id,
                email: user.email,
                tier: user.tier,
                username: user.username
            },
            this.secret,
            { expiresIn: '7d' }
        );
    }

    private publicUser(user: any) {
        return {
            id: user.id,
            svzn_id: user.svzn_id,
            email: user.email,
            name: user.name,
            tier: user.tier,
            username: user.username,
            avatar: user.avatar,
            bio: user.bio,
            verified: !!user.verified,
        };
    }

    public getUserStats(userId: string) {
        try {
            // Real stats from play_history
            const row = db.prepare(`
                SELECT
                    COUNT(DISTINCT track_id) as totalTracks,
                    COALESCE(SUM(duration_ms), 0) / 60000.0 as totalMinutes,
                    (SELECT artist FROM play_history WHERE user_id = ? GROUP BY artist ORDER BY COUNT(*) DESC LIMIT 1) as topArtist,
                    (SELECT track_name || ' - ' || artist FROM play_history WHERE user_id = ? GROUP BY track_name ORDER BY COUNT(*) DESC LIMIT 1) as mostPlayed
                FROM play_history WHERE user_id = ?
            `).get(userId, userId, userId) as any;

            // Weekly activity (last 7 days)
            const days = ['L','M','X','J','V','S','D'];
            const weekly = days.map((dayOfWeek, i) => {
                const dayStart = Date.now() - (6 - i) * 86400000;
                const dayEnd = dayStart + 86400000;
                const count = (db.prepare(
                    'SELECT COUNT(*) as c FROM play_history WHERE user_id = ? AND played_at >= ? AND played_at < ?'
                ).get(userId, dayStart, dayEnd) as any)?.c || 0;
                return { dayOfWeek, count };
            });

            // Top tracks
            const topTracks = db.prepare(`
                SELECT track_name as title, artist, COUNT(*) as count
                FROM play_history WHERE user_id = ?
                GROUP BY track_name, artist
                ORDER BY count DESC LIMIT 5
            `).all(userId) as any[];

            return {
                totalTracks: row?.totalTracks || 0,
                totalMinutes: Math.round(row?.totalMinutes || 0),
                topArtist: row?.topArtist || 'N/A',
                mostPlayed: row?.mostPlayed || 'N/A',
                weekly,
                topTracks: topTracks.length > 0 ? topTracks : []
            };
        } catch (e) {
            return {
                totalTracks: 0, totalMinutes: 0,
                topArtist: 'N/A', mostPlayed: 'N/A',
                weekly: ['L','M','X','J','V','S','D'].map(d => ({ dayOfWeek: d, count: 0 })),
                topTracks: []
            };
        }
    }

    private audit(userId: string, action: string, ip: string, details: string) {
        db.prepare('INSERT INTO audit_logs (user_id, action, ip_address, timestamp, details) VALUES (?, ?, ?, ?, ?)')
            .run(userId, action, ip, Date.now(), details);
    }
}

export const authController = new AuthController();
