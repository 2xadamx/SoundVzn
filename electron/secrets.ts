/**
 * secrets.ts — Compiled secrets for production Electron builds.
 *
 * HOW IT WORKS (SECURITY MODEL):
 * These values are replaced at build time by Vite's `define` mechanism.
 * They are NOT read from a `.env` file at runtime — no plaintext secrets
 * ship with the app distribution. Values are burned into dist-electron/backend.js
 * as string literals during `npm run build`.
 *
 * In development, process.env is used as fallback so dotenv still works normally.
 *
 * DO NOT export this file from any frontend (renderer) entry point.
 * It is imported only by backend Electron files (main.ts, backendApi.ts, mailer.ts, authController.ts).
 */

// ——— SMTP (Email) ———
export const SMTP_HOST: string = (typeof __SMTP_HOST__ !== 'undefined' ? __SMTP_HOST__ : process.env.SMTP_HOST) || 'smtp.gmail.com';
export const SMTP_PORT_STR: string = (typeof __SMTP_PORT__ !== 'undefined' ? __SMTP_PORT__ : process.env.SMTP_PORT) || '587';
export const SMTP_PORT: number = parseInt(SMTP_PORT_STR, 10);
export const SMTP_SECURE: boolean = (typeof __SMTP_SECURE__ !== 'undefined' ? __SMTP_SECURE__ : (process.env.SMTP_SECURE || 'false')) === 'true' || SMTP_PORT === 465;
export const SMTP_USER: string = (typeof __SMTP_USER__ !== 'undefined' ? __SMTP_USER__ : process.env.SMTP_USER) || '';
export const SMTP_PASS: string = (typeof __SMTP_PASS__ !== 'undefined' ? __SMTP_PASS__ : process.env.SMTP_PASS) || '';
export const SMTP_FROM: string = (typeof __SMTP_FROM__ !== 'undefined' ? __SMTP_FROM__ : process.env.SMTP_FROM) || SMTP_USER;

// ——— Authentication ———
export const JWT_SECRET: string = (typeof __JWT_SECRET__ !== 'undefined' ? __JWT_SECRET__ : process.env.JWT_SECRET) || 'soundvzn_fallback_dev_secret_2026';

// ——— Spotify ———
export const SPOTIFY_CLIENT_ID: string = (typeof __SPOTIFY_CLIENT_ID__ !== 'undefined' ? __SPOTIFY_CLIENT_ID__ : process.env.SPOTIFY_CLIENT_ID) || '';
export const SPOTIFY_CLIENT_SECRET: string = (typeof __SPOTIFY_CLIENT_SECRET__ !== 'undefined' ? __SPOTIFY_CLIENT_SECRET__ : process.env.SPOTIFY_CLIENT_SECRET) || '';

// ——— Last.fm ———
export const LASTFM_API_KEY: string = (typeof __LASTFM_API_KEY__ !== 'undefined' ? __LASTFM_API_KEY__ : (process.env.LASTFM_API_KEY || process.env.VITE_LASTFM_API_KEY)) || '';

// ——— Google OAuth ———
export const GOOGLE_CLIENT_SECRET: string = (typeof __GOOGLE_CLIENT_SECRET__ !== 'undefined' ? __GOOGLE_CLIENT_SECRET__ : process.env.GOOGLE_CLIENT_SECRET) || '';

// ——— Stripe ———
export const STRIPE_SECRET_KEY: string = (typeof __STRIPE_SECRET_KEY__ !== 'undefined' ? __STRIPE_SECRET_KEY__ : process.env.STRIPE_SECRET_KEY) || '';
export const STRIPE_PUBLISHABLE_KEY: string = (typeof __STRIPE_PUBLISHABLE_KEY__ !== 'undefined' ? __STRIPE_PUBLISHABLE_KEY__ : process.env.STRIPE_PUBLISHABLE_KEY) || '';
export const STRIPE_PRICE_ID_PRO: string = (typeof __STRIPE_PRICE_ID_PRO__ !== 'undefined' ? __STRIPE_PRICE_ID_PRO__ : process.env.STRIPE_PRICE_ID_PRO) || '';
export const STRIPE_WEBHOOK_SECRET: string = (typeof __STRIPE_WEBHOOK_SECRET__ !== 'undefined' ? __STRIPE_WEBHOOK_SECRET__ : process.env.STRIPE_WEBHOOK_SECRET) || '';
