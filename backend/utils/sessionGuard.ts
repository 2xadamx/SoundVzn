import { Response } from 'express';

/**
 * Enterprise Session Guard
 * Handles secure cookie management and session integrity.
 */
export class SessionGuard {
    private static readonly COOKIE_NAME = 'svzn_session';
    private static readonly DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

    /**
     * Sets a secure session cookie
     */
    public static setSession(res: Response, token: string, persistent: boolean = true) {
        res.cookie(this.COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: persistent ? this.DEFAULT_MAX_AGE : undefined,
            path: '/', // Ensure cookie is available on all routes
        });
    }

    /**
     * Clears the session cookie
     */
    public static clearSession(res: Response) {
        res.clearCookie(this.COOKIE_NAME, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax'
        });
    }

    /**
     * Extracts token from request cookies
     */
    public static getToken(req: any): string | null {
        return req.cookies?.[this.COOKIE_NAME] || null;
    }
}
