import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

// Importa defineConfig de vitest/config para las opciones de test
import { defineConfig as defineVitestConfig } from 'vitest/config';

export default defineVitestConfig({ // Usa defineVitestConfig aquí
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
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
