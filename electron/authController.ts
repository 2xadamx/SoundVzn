import { createRequire } from 'node:module';
import path from 'path';
import fs from 'fs';
const require = createRequire(import.meta.url);

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
import { mailer } from './mailer';
import crypto from 'crypto';
const Database = require('better-sqlite3');
import { JWT_SECRET } from './secrets';

const getJWTSecret = () => JWT_SECRET || 'stellar_secure_super_secret_key_2026';
const SALT_ROUNDS = 12; // Industrial standard

let db: any;
let stmts: any = {};
let initialized = false;

function initializeDb() {
  if (initialized) return;
  initialized = true;

  // Robust Path Resolution for DB
  // In production (Electron fork), SOUNDVZN_USER_DATA is app.getPath('userData').
  // We MUST ensure this path is absolute and reachable.
  const baseDataDir = process.env.SOUNDVZN_USER_DATA;
  let userDataPath: string;

  if (baseDataDir && path.isAbsolute(baseDataDir)) {
    userDataPath = baseDataDir;
  } else {
    // Development or fallback
    userDataPath = path.join(process.cwd(), '.soundvzn_data');
  }

  if (!fs.existsSync(userDataPath)) {
    try {
      fs.mkdirSync(userDataPath, { recursive: true });
    } catch (e: any) {
      console.error(`[Security] CRITICAL: Could not create userData directory at ${userDataPath}:`, e.message);
      // Last-ditch fallback to temp or current dir to avoid total crash
      userDataPath = process.cwd();
    }
  }

  const dbPath = path.join(userDataPath, 'auth.db');

  console.log(`[Security] DB Initialization:
    Final Path: ${dbPath}
    Env DATA: ${process.env.SOUNDVZN_USER_DATA || '(not set)'}
    CWD: ${process.cwd()}
  `);

  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT UNIQUE NOT NULL,
        tier TEXT DEFAULT 'standard',
        verified INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        security_score INTEGER DEFAULT 50
      );

      CREATE TABLE IF NOT EXISTS verification_codes (
        email TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        failed_attempts INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        ip_address TEXT,
        timestamp INTEGER NOT NULL,
        details TEXT
      );

      CREATE TABLE IF NOT EXISTS rate_limits (
        ip_address TEXT PRIMARY KEY,
        attempts INTEGER DEFAULT 0,
        lockout_until INTEGER DEFAULT 0
      );
    `);

    stmts = {
      getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
      getUserByName: db.prepare('SELECT * FROM users WHERE name = ?'),
      getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
      insertUser: db.prepare('INSERT INTO users (id, email, password_hash, name, created_at, verified) VALUES (?, ?, ?, ?, ?, 0)'),
      updateVerification: db.prepare('UPDATE users SET verified = 1, security_score = security_score + 25 WHERE email = ?'),
      updatePassword: db.prepare('UPDATE users SET password_hash = ? WHERE email = ?'),
      updateProfile: db.prepare('UPDATE users SET name = COALESCE(?, name) WHERE id = ?'),
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
    };
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

export const authController = {
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

    try {
      const id = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const now = Date.now();

      stmts.insertUser.run(id, email, hashedPassword, name, now);
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

    const token = jwt.sign({ id: user.id, email: user.email }, getJWTSecret(), { expiresIn: '1h' });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    stmts.storeRefreshToken.run(refreshToken, user.id, Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    stmts.logAudit.run(user.id, 'LOGIN', ip, Date.now(), 'User logged in');
    return {
      access_token: token,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, name: user.name, tier: user.tier }
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

    const newToken = jwt.sign({ id: user.id, email: user.email }, getJWTSecret(), { expiresIn: '1h' });
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

  async updateProfile(userId: string, data: { name?: string }) {
    initializeDb();
    if (data.name) {
      const existing = stmts.getUserByName.get(data.name);
      if (existing && existing.id !== userId) {
        throw new Error('El nombre de usuario ya está en uso');
      }
    }
    stmts.updateProfile.run(data.name || null, userId);
  },

  getSecurityDashboard(userId: string) {
    initializeDb();
    const user = stmts.getUserById.get(userId);
    return { security_score: user ? user.security_score : 0 };
  },

  getAuditLogs(userId: string) {
    initializeDb();
    return stmts.getAuditLogs.all(userId);
  }
};
