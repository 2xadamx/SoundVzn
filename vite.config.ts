import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Importa defineConfig de vitest/config para las opciones de test
import { defineConfig as defineVitestConfig } from 'vitest/config';

// ——— Load .env for build-time secret injection ———
// These values are compiled into dist-electron/backend.js as string literals.
// No .env file ships with the packaged app. The user cannot read these at runtime.
const envFile = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

/**
 * Build define map — every secret gets a unique global identifier.
 * TypeScript type declarations for these are in electron/global.d.ts.
 */
function buildSecretDefines(): Record<string, string> {
  const str = (key: string, fallback = '') =>
    JSON.stringify(process.env[key] || fallback);

  return {
    __SMTP_HOST__: str('SMTP_HOST', 'smtp.gmail.com'),
    __SMTP_PORT__: str('SMTP_PORT', '587'),
    __SMTP_SECURE__: str('SMTP_SECURE', 'false'),
    __SMTP_USER__: str('SMTP_USER'),
    __SMTP_PASS__: str('SMTP_PASS'),
    __SMTP_FROM__: str('SMTP_FROM'),
    __JWT_SECRET__: str('JWT_SECRET', 'soundvzn_fallback_dev_secret_2026'),
    __SPOTIFY_CLIENT_ID__: str('SPOTIFY_CLIENT_ID'),
    __SPOTIFY_CLIENT_SECRET__: str('SPOTIFY_CLIENT_SECRET'),
    __LASTFM_API_KEY__: str('LASTFM_API_KEY'),
    __GOOGLE_CLIENT_SECRET__: str('GOOGLE_CLIENT_SECRET'),
    __STRIPE_SECRET_KEY__: str('STRIPE_SECRET_KEY'),
    __STRIPE_PUBLISHABLE_KEY__: str('STRIPE_PUBLISHABLE_KEY'),
    __STRIPE_PRICE_ID_PRO__: str('STRIPE_PRICE_ID_PRO'),
    __STRIPE_WEBHOOK_SECRET__: str('STRIPE_WEBHOOK_SECRET'),
  };
}

export default defineVitestConfig({ // Usa defineVitestConfig aquí
  base: './',
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          define: buildSecretDefines(),
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              output: {
                format: 'es', // FORCE ESM for Main Process
                entryFileNames: 'main.js',
              },
              external: [
                'electron',
                'express',
                'axios',
                'dotenv',
                'music-metadata',
                'better-sqlite3',
                'play-dl',
                'cheerio',
                'yt-search',
                'node-fetch',
                'undici',
                'youtube-dl-exec',
                'stripe',
                'nodemailer',
                'bcrypt',
                'jsonwebtoken'
              ],
            },
          },
        },
      },
      {
        entry: 'electron/backendChild.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          define: buildSecretDefines(),
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              output: {
                format: 'es',
                entryFileNames: 'backend.js',
              },
              external: [
                'electron',
                'express',
                'axios',
                'music-metadata',
                'better-sqlite3',
                'play-dl',
                'cheerio',
                'yt-search',
                'node-fetch',
                'undici',
                'youtube-dl-exec',
                'stripe',
                'nodemailer',
                'bcrypt',
                'jsonwebtoken'
                // NOTE: 'dotenv' intentionally removed — secrets.ts is bundled inline
              ],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            emptyOutDir: false,
            rollupOptions: {
              input: 'electron/preload.ts',
              output: {
                format: 'es',
                entryFileNames: 'preload.js',
              },
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 5199,
    strictPort: true,
    proxy: {
      '/api-deezer': {
        target: 'https://api.deezer.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-deezer/, ''),
      },
    },
  },
  test: {
    globals: true, // Usa APIs globales (describe, it, expect, etc.)
    environment: 'jsdom', // Entorno de navegador simulado para tests de React
    setupFiles: './setupTests.ts', // Archivo para configuración global de tests
    css: true, // Habilita la importación de CSS en tests
    coverage: {
      provider: 'v8', // o 'istanbul'
      reporter: ['html', 'text', 'json'],
      exclude: [
        'node_modules/',
        'electron/',
        'dist/',
        'dist-electron/',
        'src/main.tsx',
        'src/App.tsx',
        'src/types/',
        '*.config.ts',
        '*.config.js',
        'postcss.config.js',
        'tailwind.config.js',
      ],
    },
  },
});
