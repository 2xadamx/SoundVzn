import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger.js';

const blacklist = new Map<string, { count: number, until: number }>();
const MAX_VIOLATIONS = 5;
const BAN_DURATION = 15 * 60 * 1000; // 15 minutes

const isLocalhost = (ip: string) =>
    ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

/**
 * Sentinel Anti-Abuse Middleware
 * Protects the core from brute-force and identity theft attempts.
 */
export const sentinel = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || '127.0.0.1';

    // Dev: no bloquear localhost (React Strict Mode dispara /auth/me varias veces)
    if (process.env.NODE_ENV !== 'production' && isLocalhost(ip)) {
        return next();
    }

    const record = blacklist.get(ip);

    if (record && record.until > Date.now()) {
        Logger.warn(`[Sentinel] Blocked request from blacklisted IP: ${ip}`);
        return res.status(429).json({ 
            error: 'Acceso restringido temporalmente', 
            message: 'Demasiados intentos fallidos. Inténtalo de nuevo más tarde.' 
        });
    }

    // Intercept response to track violations
    const originalSend = res.json;
    res.json = function(body) {
        if (res.statusCode === 401 || res.statusCode === 403) {
            const current = blacklist.get(ip) || { count: 0, until: 0 };
            current.count++;
            if (current.count >= MAX_VIOLATIONS) {
                current.until = Date.now() + BAN_DURATION;
                Logger.error(`[Sentinel] IP ${ip} BLACKLISTED for ${BAN_DURATION/60000}m`);
            }
            blacklist.set(ip, current);
        }
        return originalSend.call(this, body);
    };

    next();
};
