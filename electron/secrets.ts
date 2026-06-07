import dotenv from 'dotenv';

// Carga las variables de entorno desde el archivo .env
dotenv.config();

/**
 * secrets.ts — Loaded dynamically via dotenv at runtime.
 * 
 * We no longer use Vite's `define` to burn secrets into the build,
 * as that causes security vulnerabilities (shipping secrets to clients).
 * This file is ONLY used by the Electron backend process.
 */

// ——— SMTP (Email) ———
export const SMTP_HOST: string = process.env.SMTP_HOST || 'smtp.gmail.com';
export const SMTP_PORT_STR: string = process.env.SMTP_PORT || '587';
export const SMTP_PORT: number = parseInt(SMTP_PORT_STR, 10) || 587;
export const SMTP_SECURE: boolean = (process.env.SMTP_SECURE || 'false') === 'true' || SMTP_PORT === 465;
export const SMTP_USER: string = process.env.SMTP_USER || '';
export const SMTP_PASS: string = process.env.SMTP_PASS || '';
export const SMTP_FROM: string = process.env.SMTP_FROM || SMTP_USER;

// ——— Authentication ———
export const JWT_SECRET: string = process.env.JWT_SECRET || '';

// ——— Spotify ———
export const SPOTIFY_CLIENT_ID: string = process.env.SPOTIFY_CLIENT_ID || '';
export const SPOTIFY_CLIENT_SECRET: string = process.env.SPOTIFY_CLIENT_SECRET || '';

// ——— Last.fm ———
export const LASTFM_API_KEY: string = process.env.LASTFM_API_KEY || '';

// ——— Google OAuth ———
export const GOOGLE_CLIENT_ID: string = process.env.VITE_GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET || '';

// ——— Microsoft OAuth ———
export const MICROSOFT_CLIENT_ID: string = process.env.VITE_MICROSOFT_CLIENT_ID || '';
export const MICROSOFT_CLIENT_SECRET: string = process.env.MICROSOFT_CLIENT_SECRET || '';

// ——— Discord OAuth ———
export const DISCORD_CLIENT_ID: string = process.env.DISCORD_CLIENT_ID || '1484558840715284593';
export const DISCORD_PUBLIC_KEY: string = process.env.DISCORD_PUBLIC_KEY || '6790c534ec1f2ffa4238bd658c38b51319f38bd0fd052862ebe7752e4ef61124';

// ——— Stripe ———
export const STRIPE_SECRET_KEY: string = process.env.STRIPE_SECRET_KEY || '';
export const STRIPE_PUBLISHABLE_KEY: string = process.env.STRIPE_PUBLISHABLE_KEY || '';
export const STRIPE_PRICE_ID_PRO: string = process.env.STRIPE_PRICE_ID_PRO || '';
export const STRIPE_WEBHOOK_SECRET: string = process.env.STRIPE_WEBHOOK_SECRET || '';
