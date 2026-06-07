import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';


export default defineConfig(({ mode }) => {
  const isWeb = process.env.VITE_WEB === 'true' || mode === 'web';
  return {
    base: isWeb ? '/' : './',
    define: isWeb ? {
      'process.env': {},
      'global': 'window',
    } : {},
    optimizeDeps: {
      noDiscovery: false,
      entries: ['index.html'],
      include: [
        'react', 'react-dom', 'framer-motion', 'lucide-react', 'axios', 'clsx', 'tailwind-merge'
      ],
      exclude: [
        'electron', 'express', 'better-sqlite3', 'play-dl', 'yt-search', 
        'youtube-dl-exec', 'stripe', 'nodemailer', 'bcrypt', 'jsonwebtoken',
        'music-metadata', 'node-id3', 'axios-extra', 'undici', 'node-fetch', 'cheerio',
        'fs', 'path', 'os', 'child_process'
      ]
    },
    plugins: [
      react(),
      !isWeb && electron([
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
                  format: 'es', 
                  entryFileNames: 'main.js',
                },
                external: [
                  'electron', 'express', 'axios', 'dotenv', 'music-metadata',
                  'better-sqlite3', 'play-dl', 'cheerio', 'yt-search', 'node-fetch',
                  'undici', 'youtube-dl-exec', 'stripe', 'nodemailer', 'bcrypt', 'jsonwebtoken'
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
                  'electron', 'express', 'axios', 'music-metadata', 'better-sqlite3',
                  'play-dl', 'cheerio', 'yt-search', 'node-fetch', 'undici',
                  'youtube-dl-exec', 'stripe', 'nodemailer', 'bcrypt', 'jsonwebtoken'
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
                  format: 'cjs',
                  entryFileNames: 'preload.js',
                  inlineDynamicImports: true,
                },
                external: ['electron'],
              },
            },
          },
        },
      ]),
      !isWeb && renderer(),
    ].filter(Boolean) as any,
    cacheDir: './.vite_cache',
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
    build: {
      chunkSizeWarningLimit: 1800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            return id.includes('node_modules') ? 'vendor' : undefined;
          },
        },
      },
    },
    server: {
      port: 5200,
      strictPort: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('cookie');
            });
          },
        },
      },
    },
    // @ts-ignore
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './setupTests.ts',
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['html', 'text', 'json'],
        exclude: [
          'node_modules/', 'electron/', 'dist/', 'dist-electron/',
          'src/main.tsx', 'src/App.tsx', 'src/types/', '*.config.ts',
        ],
      },
    },
  };
});
