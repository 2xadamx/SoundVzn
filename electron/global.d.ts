/**
 * global.d.ts — Type declarations for Vite compile-time secret defines.
 * These globals are replaced by string literals at build time via vite.config.ts `define`.
 * They are NEVER available at runtime in the renderer process.
 */

declare const __SMTP_HOST__: string;
declare const __SMTP_PORT__: string;
declare const __SMTP_SECURE__: string;
declare const __SMTP_USER__: string;
declare const __SMTP_PASS__: string;
declare const __SMTP_FROM__: string;
declare const __JWT_SECRET__: string;
declare const __SPOTIFY_CLIENT_ID__: string;
declare const __SPOTIFY_CLIENT_SECRET__: string;
declare const __LASTFM_API_KEY__: string;
declare const __GOOGLE_CLIENT_SECRET__: string;
declare const __STRIPE_SECRET_KEY__: string;
declare const __STRIPE_PUBLISHABLE_KEY__: string;
declare const __STRIPE_PRICE_ID_PRO__: string;
declare const __STRIPE_WEBHOOK_SECRET__: string;
