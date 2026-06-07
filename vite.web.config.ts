import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const stub = path.resolve(__dirname, './src/utils/empty.ts');

export default defineConfig({
  mode: 'web',
  base: '/',
  define: {
    'process.env': {},
    'global': 'window',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      'electron': path.resolve(__dirname, './src/utils/webCompat.ts'),
      // Node.js Stubs
      'fs': stub,
      'path': stub,
      'os': stub,
      'child_process': stub,
      'better-sqlite3': stub,
      'play-dl': stub,
      'yt-search': stub,
      'youtube-dl-exec': stub,
      'stripe': stub,
      'nodemailer': stub,
      'bcrypt': stub,
      'jsonwebtoken': stub,
      'music-metadata': stub,
      'node-id3': stub,
      'undici': stub,
      'node-fetch': stub,
      'cheerio': stub,
      'crypto': stub,
      'stream': stub,
      'http': stub,
      'https': stub,
      'url': stub,
      'zlib': stub,
      'buffer': stub,
      'util': stub,
    },
  },
  optimizeDeps: {
    entries: ['index.html'],
    noDiscovery: false,
    include: [
      'react', 'react-dom', 'react/jsx-dev-runtime',
      'framer-motion', 'lucide-react', 'three', '@react-three/fiber', '@react-three/drei',
      'axios', 'clsx', 'tailwind-merge', 'zustand'
    ],
  },
  plugins: [react()],
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
    host: 'localhost',
    port: 5200,
    strictPort: false,
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
    proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
        },
        '/api-deezer': {
          target: 'https://api.deezer.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-deezer/, ''),
        },
      },
  }
});
