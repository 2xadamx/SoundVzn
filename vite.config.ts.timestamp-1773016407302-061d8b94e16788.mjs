// vite.config.ts
import react from "file:///C:/Users/proxx/OneDrive/Documentos/Escritorio/SoundVizion-main/node_modules/@vitejs/plugin-react/dist/index.js";
import electron from "file:///C:/Users/proxx/OneDrive/Documentos/Escritorio/SoundVizion-main/node_modules/vite-plugin-electron/dist/index.mjs";
import renderer from "file:///C:/Users/proxx/OneDrive/Documentos/Escritorio/SoundVizion-main/node_modules/vite-plugin-electron-renderer/dist/index.mjs";
import path from "path";
import dotenv from "file:///C:/Users/proxx/OneDrive/Documentos/Escritorio/SoundVizion-main/node_modules/dotenv/lib/main.js";
import fs from "fs";
import { defineConfig as defineVitestConfig } from "file:///C:/Users/proxx/OneDrive/Documentos/Escritorio/SoundVizion-main/node_modules/vitest/dist/config.js";
var __vite_injected_original_dirname = "C:\\Users\\proxx\\OneDrive\\Documentos\\Escritorio\\SoundVizion-main";
var envFile = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}
function buildSecretDefines() {
  const str = (key, fallback = "") => JSON.stringify(process.env[key] || fallback);
  return {
    __SMTP_HOST__: str("SMTP_HOST", "smtp.gmail.com"),
    __SMTP_PORT__: str("SMTP_PORT", "587"),
    __SMTP_SECURE__: str("SMTP_SECURE", "false"),
    __SMTP_USER__: str("SMTP_USER"),
    __SMTP_PASS__: str("SMTP_PASS"),
    __SMTP_FROM__: str("SMTP_FROM"),
    __JWT_SECRET__: str("JWT_SECRET", "soundvzn_fallback_dev_secret_2026"),
    __SPOTIFY_CLIENT_ID__: str("SPOTIFY_CLIENT_ID"),
    __SPOTIFY_CLIENT_SECRET__: str("SPOTIFY_CLIENT_SECRET"),
    __LASTFM_API_KEY__: str("LASTFM_API_KEY"),
    __GOOGLE_CLIENT_SECRET__: str("GOOGLE_CLIENT_SECRET"),
    __STRIPE_SECRET_KEY__: str("STRIPE_SECRET_KEY"),
    __STRIPE_PUBLISHABLE_KEY__: str("STRIPE_PUBLISHABLE_KEY"),
    __STRIPE_PRICE_ID_PRO__: str("STRIPE_PRICE_ID_PRO"),
    __STRIPE_WEBHOOK_SECRET__: str("STRIPE_WEBHOOK_SECRET")
  };
}
var vite_config_default = defineVitestConfig({
  // Usa defineVitestConfig aquí
  base: "./",
  plugins: [
    react(),
    electron([
      {
        entry: "electron/main.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          define: buildSecretDefines(),
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              output: {
                format: "es",
                // FORCE ESM for Main Process
                entryFileNames: "main.js"
              },
              external: [
                "electron",
                "express",
                "axios",
                "dotenv",
                "music-metadata",
                "better-sqlite3",
                "play-dl",
                "cheerio",
                "yt-search",
                "node-fetch",
                "undici",
                "youtube-dl-exec",
                "stripe",
                "nodemailer",
                "bcrypt",
                "jsonwebtoken"
              ]
            }
          }
        }
      },
      {
        entry: "electron/backendChild.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          define: buildSecretDefines(),
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              output: {
                format: "es",
                entryFileNames: "backend.js"
              },
              external: [
                "electron",
                "express",
                "axios",
                "music-metadata",
                "better-sqlite3",
                "play-dl",
                "cheerio",
                "yt-search",
                "node-fetch",
                "undici",
                "youtube-dl-exec",
                "stripe",
                "nodemailer",
                "bcrypt",
                "jsonwebtoken"
                // NOTE: 'dotenv' intentionally removed — secrets.ts is bundled inline
              ]
            }
          }
        }
      },
      {
        entry: "electron/preload.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: "dist-electron",
            emptyOutDir: false,
            rollupOptions: {
              input: "electron/preload.ts",
              output: {
                format: "es",
                entryFileNames: "preload.js"
              },
              external: ["electron"]
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@components": path.resolve(__vite_injected_original_dirname, "./src/components"),
      "@store": path.resolve(__vite_injected_original_dirname, "./src/store"),
      "@utils": path.resolve(__vite_injected_original_dirname, "./src/utils"),
      "@hooks": path.resolve(__vite_injected_original_dirname, "./src/hooks"),
      "@services": path.resolve(__vite_injected_original_dirname, "./src/services"),
      "@types": path.resolve(__vite_injected_original_dirname, "./src/types")
    }
  },
  server: {
    port: 5199,
    strictPort: true,
    proxy: {
      "/api-deezer": {
        target: "https://api.deezer.com",
        changeOrigin: true,
        rewrite: (path2) => path2.replace(/^\/api-deezer/, "")
      }
    }
  },
  test: {
    globals: true,
    // Usa APIs globales (describe, it, expect, etc.)
    environment: "jsdom",
    // Entorno de navegador simulado para tests de React
    setupFiles: "./setupTests.ts",
    // Archivo para configuración global de tests
    css: true,
    // Habilita la importación de CSS en tests
    coverage: {
      provider: "v8",
      // o 'istanbul'
      reporter: ["html", "text", "json"],
      exclude: [
        "node_modules/",
        "electron/",
        "dist/",
        "dist-electron/",
        "src/main.tsx",
        "src/App.tsx",
        "src/types/",
        "*.config.ts",
        "*.config.js",
        "postcss.config.js",
        "tailwind.config.js"
      ]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxwcm94eFxcXFxPbmVEcml2ZVxcXFxEb2N1bWVudG9zXFxcXEVzY3JpdG9yaW9cXFxcU291bmRWaXppb24tbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxccHJveHhcXFxcT25lRHJpdmVcXFxcRG9jdW1lbnRvc1xcXFxFc2NyaXRvcmlvXFxcXFNvdW5kVml6aW9uLW1haW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3Byb3h4L09uZURyaXZlL0RvY3VtZW50b3MvRXNjcml0b3Jpby9Tb3VuZFZpemlvbi1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCBlbGVjdHJvbiBmcm9tICd2aXRlLXBsdWdpbi1lbGVjdHJvbic7XHJcbmltcG9ydCByZW5kZXJlciBmcm9tICd2aXRlLXBsdWdpbi1lbGVjdHJvbi1yZW5kZXJlcic7XHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgZG90ZW52IGZyb20gJ2RvdGVudic7XHJcbmltcG9ydCBmcyBmcm9tICdmcyc7XHJcblxyXG4vLyBJbXBvcnRhIGRlZmluZUNvbmZpZyBkZSB2aXRlc3QvY29uZmlnIHBhcmEgbGFzIG9wY2lvbmVzIGRlIHRlc3RcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIGFzIGRlZmluZVZpdGVzdENvbmZpZyB9IGZyb20gJ3ZpdGVzdC9jb25maWcnO1xyXG5cclxuLy8gXHUyMDE0XHUyMDE0XHUyMDE0IExvYWQgLmVudiBmb3IgYnVpbGQtdGltZSBzZWNyZXQgaW5qZWN0aW9uIFx1MjAxNFx1MjAxNFx1MjAxNFxyXG4vLyBUaGVzZSB2YWx1ZXMgYXJlIGNvbXBpbGVkIGludG8gZGlzdC1lbGVjdHJvbi9iYWNrZW5kLmpzIGFzIHN0cmluZyBsaXRlcmFscy5cclxuLy8gTm8gLmVudiBmaWxlIHNoaXBzIHdpdGggdGhlIHBhY2thZ2VkIGFwcC4gVGhlIHVzZXIgY2Fubm90IHJlYWQgdGhlc2UgYXQgcnVudGltZS5cclxuY29uc3QgZW52RmlsZSA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnLmVudicpO1xyXG5pZiAoZnMuZXhpc3RzU3luYyhlbnZGaWxlKSkge1xyXG4gIGRvdGVudi5jb25maWcoeyBwYXRoOiBlbnZGaWxlIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogQnVpbGQgZGVmaW5lIG1hcCBcdTIwMTQgZXZlcnkgc2VjcmV0IGdldHMgYSB1bmlxdWUgZ2xvYmFsIGlkZW50aWZpZXIuXHJcbiAqIFR5cGVTY3JpcHQgdHlwZSBkZWNsYXJhdGlvbnMgZm9yIHRoZXNlIGFyZSBpbiBlbGVjdHJvbi9nbG9iYWwuZC50cy5cclxuICovXHJcbmZ1bmN0aW9uIGJ1aWxkU2VjcmV0RGVmaW5lcygpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcclxuICBjb25zdCBzdHIgPSAoa2V5OiBzdHJpbmcsIGZhbGxiYWNrID0gJycpID0+XHJcbiAgICBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudltrZXldIHx8IGZhbGxiYWNrKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIF9fU01UUF9IT1NUX186IHN0cignU01UUF9IT1NUJywgJ3NtdHAuZ21haWwuY29tJyksXHJcbiAgICBfX1NNVFBfUE9SVF9fOiBzdHIoJ1NNVFBfUE9SVCcsICc1ODcnKSxcclxuICAgIF9fU01UUF9TRUNVUkVfXzogc3RyKCdTTVRQX1NFQ1VSRScsICdmYWxzZScpLFxyXG4gICAgX19TTVRQX1VTRVJfXzogc3RyKCdTTVRQX1VTRVInKSxcclxuICAgIF9fU01UUF9QQVNTX186IHN0cignU01UUF9QQVNTJyksXHJcbiAgICBfX1NNVFBfRlJPTV9fOiBzdHIoJ1NNVFBfRlJPTScpLFxyXG4gICAgX19KV1RfU0VDUkVUX186IHN0cignSldUX1NFQ1JFVCcsICdzb3VuZHZ6bl9mYWxsYmFja19kZXZfc2VjcmV0XzIwMjYnKSxcclxuICAgIF9fU1BPVElGWV9DTElFTlRfSURfXzogc3RyKCdTUE9USUZZX0NMSUVOVF9JRCcpLFxyXG4gICAgX19TUE9USUZZX0NMSUVOVF9TRUNSRVRfXzogc3RyKCdTUE9USUZZX0NMSUVOVF9TRUNSRVQnKSxcclxuICAgIF9fTEFTVEZNX0FQSV9LRVlfXzogc3RyKCdMQVNURk1fQVBJX0tFWScpLFxyXG4gICAgX19HT09HTEVfQ0xJRU5UX1NFQ1JFVF9fOiBzdHIoJ0dPT0dMRV9DTElFTlRfU0VDUkVUJyksXHJcbiAgICBfX1NUUklQRV9TRUNSRVRfS0VZX186IHN0cignU1RSSVBFX1NFQ1JFVF9LRVknKSxcclxuICAgIF9fU1RSSVBFX1BVQkxJU0hBQkxFX0tFWV9fOiBzdHIoJ1NUUklQRV9QVUJMSVNIQUJMRV9LRVknKSxcclxuICAgIF9fU1RSSVBFX1BSSUNFX0lEX1BST19fOiBzdHIoJ1NUUklQRV9QUklDRV9JRF9QUk8nKSxcclxuICAgIF9fU1RSSVBFX1dFQkhPT0tfU0VDUkVUX186IHN0cignU1RSSVBFX1dFQkhPT0tfU0VDUkVUJyksXHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lVml0ZXN0Q29uZmlnKHsgLy8gVXNhIGRlZmluZVZpdGVzdENvbmZpZyBhcXVcdTAwRURcclxuICBiYXNlOiAnLi8nLFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBlbGVjdHJvbihbXHJcbiAgICAgIHtcclxuICAgICAgICBlbnRyeTogJ2VsZWN0cm9uL21haW4udHMnLFxyXG4gICAgICAgIG9uc3RhcnQob3B0aW9ucykge1xyXG4gICAgICAgICAgb3B0aW9ucy5yZWxvYWQoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHZpdGU6IHtcclxuICAgICAgICAgIGRlZmluZTogYnVpbGRTZWNyZXREZWZpbmVzKCksXHJcbiAgICAgICAgICBidWlsZDoge1xyXG4gICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uJyxcclxuICAgICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIG91dHB1dDoge1xyXG4gICAgICAgICAgICAgICAgZm9ybWF0OiAnZXMnLCAvLyBGT1JDRSBFU00gZm9yIE1haW4gUHJvY2Vzc1xyXG4gICAgICAgICAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdtYWluLmpzJyxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIGV4dGVybmFsOiBbXHJcbiAgICAgICAgICAgICAgICAnZWxlY3Ryb24nLFxyXG4gICAgICAgICAgICAgICAgJ2V4cHJlc3MnLFxyXG4gICAgICAgICAgICAgICAgJ2F4aW9zJyxcclxuICAgICAgICAgICAgICAgICdkb3RlbnYnLFxyXG4gICAgICAgICAgICAgICAgJ211c2ljLW1ldGFkYXRhJyxcclxuICAgICAgICAgICAgICAgICdiZXR0ZXItc3FsaXRlMycsXHJcbiAgICAgICAgICAgICAgICAncGxheS1kbCcsXHJcbiAgICAgICAgICAgICAgICAnY2hlZXJpbycsXHJcbiAgICAgICAgICAgICAgICAneXQtc2VhcmNoJyxcclxuICAgICAgICAgICAgICAgICdub2RlLWZldGNoJyxcclxuICAgICAgICAgICAgICAgICd1bmRpY2knLFxyXG4gICAgICAgICAgICAgICAgJ3lvdXR1YmUtZGwtZXhlYycsXHJcbiAgICAgICAgICAgICAgICAnc3RyaXBlJyxcclxuICAgICAgICAgICAgICAgICdub2RlbWFpbGVyJyxcclxuICAgICAgICAgICAgICAgICdiY3J5cHQnLFxyXG4gICAgICAgICAgICAgICAgJ2pzb253ZWJ0b2tlbidcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgZW50cnk6ICdlbGVjdHJvbi9iYWNrZW5kQ2hpbGQudHMnLFxyXG4gICAgICAgIG9uc3RhcnQob3B0aW9ucykge1xyXG4gICAgICAgICAgb3B0aW9ucy5yZWxvYWQoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHZpdGU6IHtcclxuICAgICAgICAgIGRlZmluZTogYnVpbGRTZWNyZXREZWZpbmVzKCksXHJcbiAgICAgICAgICBidWlsZDoge1xyXG4gICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uJyxcclxuICAgICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIG91dHB1dDoge1xyXG4gICAgICAgICAgICAgICAgZm9ybWF0OiAnZXMnLFxyXG4gICAgICAgICAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdiYWNrZW5kLmpzJyxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIGV4dGVybmFsOiBbXHJcbiAgICAgICAgICAgICAgICAnZWxlY3Ryb24nLFxyXG4gICAgICAgICAgICAgICAgJ2V4cHJlc3MnLFxyXG4gICAgICAgICAgICAgICAgJ2F4aW9zJyxcclxuICAgICAgICAgICAgICAgICdtdXNpYy1tZXRhZGF0YScsXHJcbiAgICAgICAgICAgICAgICAnYmV0dGVyLXNxbGl0ZTMnLFxyXG4gICAgICAgICAgICAgICAgJ3BsYXktZGwnLFxyXG4gICAgICAgICAgICAgICAgJ2NoZWVyaW8nLFxyXG4gICAgICAgICAgICAgICAgJ3l0LXNlYXJjaCcsXHJcbiAgICAgICAgICAgICAgICAnbm9kZS1mZXRjaCcsXHJcbiAgICAgICAgICAgICAgICAndW5kaWNpJyxcclxuICAgICAgICAgICAgICAgICd5b3V0dWJlLWRsLWV4ZWMnLFxyXG4gICAgICAgICAgICAgICAgJ3N0cmlwZScsXHJcbiAgICAgICAgICAgICAgICAnbm9kZW1haWxlcicsXHJcbiAgICAgICAgICAgICAgICAnYmNyeXB0JyxcclxuICAgICAgICAgICAgICAgICdqc29ud2VidG9rZW4nXHJcbiAgICAgICAgICAgICAgICAvLyBOT1RFOiAnZG90ZW52JyBpbnRlbnRpb25hbGx5IHJlbW92ZWQgXHUyMDE0IHNlY3JldHMudHMgaXMgYnVuZGxlZCBpbmxpbmVcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgZW50cnk6ICdlbGVjdHJvbi9wcmVsb2FkLnRzJyxcclxuICAgICAgICBvbnN0YXJ0KG9wdGlvbnMpIHtcclxuICAgICAgICAgIG9wdGlvbnMucmVsb2FkKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICB2aXRlOiB7XHJcbiAgICAgICAgICBidWlsZDoge1xyXG4gICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uJyxcclxuICAgICAgICAgICAgZW1wdHlPdXREaXI6IGZhbHNlLFxyXG4gICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgaW5wdXQ6ICdlbGVjdHJvbi9wcmVsb2FkLnRzJyxcclxuICAgICAgICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgICAgICAgIGZvcm1hdDogJ2VzJyxcclxuICAgICAgICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAncHJlbG9hZC5qcycsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBleHRlcm5hbDogWydlbGVjdHJvbiddLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgXSksXHJcbiAgICByZW5kZXJlcigpLFxyXG4gIF0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcclxuICAgICAgJ0Bjb21wb25lbnRzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2NvbXBvbmVudHMnKSxcclxuICAgICAgJ0BzdG9yZSc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9zdG9yZScpLFxyXG4gICAgICAnQHV0aWxzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3V0aWxzJyksXHJcbiAgICAgICdAaG9va3MnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvaG9va3MnKSxcclxuICAgICAgJ0BzZXJ2aWNlcyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9zZXJ2aWNlcycpLFxyXG4gICAgICAnQHR5cGVzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3R5cGVzJyksXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTk5LFxyXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpLWRlZXplcic6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2FwaS5kZWV6ZXIuY29tJyxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaS1kZWV6ZXIvLCAnJyksXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgdGVzdDoge1xyXG4gICAgZ2xvYmFsczogdHJ1ZSwgLy8gVXNhIEFQSXMgZ2xvYmFsZXMgKGRlc2NyaWJlLCBpdCwgZXhwZWN0LCBldGMuKVxyXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsIC8vIEVudG9ybm8gZGUgbmF2ZWdhZG9yIHNpbXVsYWRvIHBhcmEgdGVzdHMgZGUgUmVhY3RcclxuICAgIHNldHVwRmlsZXM6ICcuL3NldHVwVGVzdHMudHMnLCAvLyBBcmNoaXZvIHBhcmEgY29uZmlndXJhY2lcdTAwRjNuIGdsb2JhbCBkZSB0ZXN0c1xyXG4gICAgY3NzOiB0cnVlLCAvLyBIYWJpbGl0YSBsYSBpbXBvcnRhY2lcdTAwRjNuIGRlIENTUyBlbiB0ZXN0c1xyXG4gICAgY292ZXJhZ2U6IHtcclxuICAgICAgcHJvdmlkZXI6ICd2OCcsIC8vIG8gJ2lzdGFuYnVsJ1xyXG4gICAgICByZXBvcnRlcjogWydodG1sJywgJ3RleHQnLCAnanNvbiddLFxyXG4gICAgICBleGNsdWRlOiBbXHJcbiAgICAgICAgJ25vZGVfbW9kdWxlcy8nLFxyXG4gICAgICAgICdlbGVjdHJvbi8nLFxyXG4gICAgICAgICdkaXN0LycsXHJcbiAgICAgICAgJ2Rpc3QtZWxlY3Ryb24vJyxcclxuICAgICAgICAnc3JjL21haW4udHN4JyxcclxuICAgICAgICAnc3JjL0FwcC50c3gnLFxyXG4gICAgICAgICdzcmMvdHlwZXMvJyxcclxuICAgICAgICAnKi5jb25maWcudHMnLFxyXG4gICAgICAgICcqLmNvbmZpZy5qcycsXHJcbiAgICAgICAgJ3Bvc3Rjc3MuY29uZmlnLmpzJyxcclxuICAgICAgICAndGFpbHdpbmQuY29uZmlnLmpzJyxcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxjQUFjO0FBQ3JCLE9BQU8sY0FBYztBQUNyQixPQUFPLFVBQVU7QUFDakIsT0FBTyxZQUFZO0FBQ25CLE9BQU8sUUFBUTtBQUdmLFNBQVMsZ0JBQWdCLDBCQUEwQjtBQVRuRCxJQUFNLG1DQUFtQztBQWN6QyxJQUFNLFVBQVUsS0FBSyxRQUFRLFFBQVEsSUFBSSxHQUFHLE1BQU07QUFDbEQsSUFBSSxHQUFHLFdBQVcsT0FBTyxHQUFHO0FBQzFCLFNBQU8sT0FBTyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ2pDO0FBTUEsU0FBUyxxQkFBNkM7QUFDcEQs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
