// vite.config.ts
import react from "file:///C:/Users/proxx/OneDrive/Documentos/Escritorio/SoundVizion-main/node_modules/@vitejs/plugin-react/dist/index.js";
import electron from "file:///C:/Users/proxx/OneDrive/Documentos/Escritorio/SoundVizion-main/node_modules/vite-plugin-electron/dist/index.mjs";
import renderer from "file:///C:/Users/proxx/OneDrive/Documentos/Escritorio/SoundVizion-main/node_modules/vite-plugin-electron-renderer/dist/index.mjs";
import path from "path";
import { defineConfig as defineVitestConfig } from "file:///C:/Users/proxx/OneDrive/Documentos/Escritorio/SoundVizion-main/node_modules/vitest/dist/config.js";
var __vite_injected_original_dirname = "C:\\Users\\proxx\\OneDrive\\Documentos\\Escritorio\\SoundVizion-main";
var vite_config_default = defineVitestConfig({
  // Usa defineVitestConfig aquí
  plugins: [
    react(),
    electron([
      {
        entry: "electron/main.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
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
        entry: "electron/preload.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: "dist-electron",
            lib: {
              entry: "electron/preload.ts",
              formats: ["cjs"],
              // FORCE CJS for Preload
              fileName: () => "preload.cjs"
            },
            rollupOptions: {
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxwcm94eFxcXFxPbmVEcml2ZVxcXFxEb2N1bWVudG9zXFxcXEVzY3JpdG9yaW9cXFxcU291bmRWaXppb24tbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxccHJveHhcXFxcT25lRHJpdmVcXFxcRG9jdW1lbnRvc1xcXFxFc2NyaXRvcmlvXFxcXFNvdW5kVml6aW9uLW1haW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3Byb3h4L09uZURyaXZlL0RvY3VtZW50b3MvRXNjcml0b3Jpby9Tb3VuZFZpemlvbi1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGVsZWN0cm9uIGZyb20gJ3ZpdGUtcGx1Z2luLWVsZWN0cm9uJztcbmltcG9ydCByZW5kZXJlciBmcm9tICd2aXRlLXBsdWdpbi1lbGVjdHJvbi1yZW5kZXJlcic7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gSW1wb3J0YSBkZWZpbmVDb25maWcgZGUgdml0ZXN0L2NvbmZpZyBwYXJhIGxhcyBvcGNpb25lcyBkZSB0ZXN0XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgYXMgZGVmaW5lVml0ZXN0Q29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZVZpdGVzdENvbmZpZyh7IC8vIFVzYSBkZWZpbmVWaXRlc3RDb25maWcgYXF1XHUwMEVEXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIGVsZWN0cm9uKFtcbiAgICAgIHtcbiAgICAgICAgZW50cnk6ICdlbGVjdHJvbi9tYWluLnRzJyxcbiAgICAgICAgb25zdGFydChvcHRpb25zKSB7XG4gICAgICAgICAgb3B0aW9ucy5yZWxvYWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdml0ZToge1xuICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uJyxcbiAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgZm9ybWF0OiAnZXMnLCAvLyBGT1JDRSBFU00gZm9yIE1haW4gUHJvY2Vzc1xuICAgICAgICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnbWFpbi5qcycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGV4dGVybmFsOiBbXG4gICAgICAgICAgICAgICAgJ2VsZWN0cm9uJyxcbiAgICAgICAgICAgICAgICAnZXhwcmVzcycsXG4gICAgICAgICAgICAgICAgJ2F4aW9zJyxcbiAgICAgICAgICAgICAgICAnZG90ZW52JyxcbiAgICAgICAgICAgICAgICAnbXVzaWMtbWV0YWRhdGEnLFxuICAgICAgICAgICAgICAgICdiZXR0ZXItc3FsaXRlMycsXG4gICAgICAgICAgICAgICAgJ3BsYXktZGwnLFxuICAgICAgICAgICAgICAgICdjaGVlcmlvJyxcbiAgICAgICAgICAgICAgICAneXQtc2VhcmNoJyxcbiAgICAgICAgICAgICAgICAnbm9kZS1mZXRjaCcsXG4gICAgICAgICAgICAgICAgJ3VuZGljaScsXG4gICAgICAgICAgICAgICAgJ3lvdXR1YmUtZGwtZXhlYycsXG4gICAgICAgICAgICAgICAgJ3N0cmlwZScsXG4gICAgICAgICAgICAgICAgJ25vZGVtYWlsZXInLFxuICAgICAgICAgICAgICAgICdiY3J5cHQnLFxuICAgICAgICAgICAgICAgICdqc29ud2VidG9rZW4nXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBlbnRyeTogJ2VsZWN0cm9uL3ByZWxvYWQudHMnLFxuICAgICAgICBvbnN0YXJ0KG9wdGlvbnMpIHtcbiAgICAgICAgICBvcHRpb25zLnJlbG9hZCgpO1xuICAgICAgICB9LFxuICAgICAgICB2aXRlOiB7XG4gICAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIG91dERpcjogJ2Rpc3QtZWxlY3Ryb24nLFxuICAgICAgICAgICAgbGliOiB7XG4gICAgICAgICAgICAgIGVudHJ5OiAnZWxlY3Ryb24vcHJlbG9hZC50cycsXG4gICAgICAgICAgICAgIGZvcm1hdHM6IFsnY2pzJ10sIC8vIEZPUkNFIENKUyBmb3IgUHJlbG9hZFxuICAgICAgICAgICAgICBmaWxlTmFtZTogKCkgPT4gJ3ByZWxvYWQuY2pzJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgIGV4dGVybmFsOiBbJ2VsZWN0cm9uJ10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIF0pLFxuICAgIHJlbmRlcmVyKCksXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICdAY29tcG9uZW50cyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9jb21wb25lbnRzJyksXG4gICAgICAnQHN0b3JlJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3N0b3JlJyksXG4gICAgICAnQHV0aWxzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3V0aWxzJyksXG4gICAgICAnQGhvb2tzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2hvb2tzJyksXG4gICAgICAnQHNlcnZpY2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3NlcnZpY2VzJyksXG4gICAgICAnQHR5cGVzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3R5cGVzJyksXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE5OSxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaS1kZWV6ZXInOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vYXBpLmRlZXplci5jb20nLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGktZGVlemVyLywgJycpLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICB0ZXN0OiB7XG4gICAgZ2xvYmFsczogdHJ1ZSwgLy8gVXNhIEFQSXMgZ2xvYmFsZXMgKGRlc2NyaWJlLCBpdCwgZXhwZWN0LCBldGMuKVxuICAgIGVudmlyb25tZW50OiAnanNkb20nLCAvLyBFbnRvcm5vIGRlIG5hdmVnYWRvciBzaW11bGFkbyBwYXJhIHRlc3RzIGRlIFJlYWN0XG4gICAgc2V0dXBGaWxlczogJy4vc2V0dXBUZXN0cy50cycsIC8vIEFyY2hpdm8gcGFyYSBjb25maWd1cmFjaVx1MDBGM24gZ2xvYmFsIGRlIHRlc3RzXG4gICAgY3NzOiB0cnVlLCAvLyBIYWJpbGl0YSBsYSBpbXBvcnRhY2lcdTAwRjNuIGRlIENTUyBlbiB0ZXN0c1xuICAgIGNvdmVyYWdlOiB7XG4gICAgICBwcm92aWRlcjogJ3Y4JywgLy8gbyAnaXN0YW5idWwnXG4gICAgICByZXBvcnRlcjogWydodG1sJywgJ3RleHQnLCAnanNvbiddLFxuICAgICAgZXhjbHVkZTogW1xuICAgICAgICAnbm9kZV9tb2R1bGVzLycsXG4gICAgICAgICdlbGVjdHJvbi8nLFxuICAgICAgICAnZGlzdC8nLFxuICAgICAgICAnZGlzdC1lbGVjdHJvbi8nLFxuICAgICAgICAnc3JjL21haW4udHN4JyxcbiAgICAgICAgJ3NyYy9BcHAudHN4JyxcbiAgICAgICAgJ3NyYy90eXBlcy8nLFxuICAgICAgICAnKi5jb25maWcudHMnLFxuICAgICAgICAnKi5jb25maWcuanMnLFxuICAgICAgICAncG9zdGNzcy5jb25maWcuanMnLFxuICAgICAgICAndGFpbHdpbmQuY29uZmlnLmpzJyxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLE9BQU8sV0FBVztBQUNsQixPQUFPLGNBQWM7QUFDckIsT0FBTyxjQUFjO0FBQ3JCLE9BQU8sVUFBVTtBQUdqQixTQUFTLGdCQUFnQiwwQkFBMEI7QUFQbkQsSUFBTSxtQ0FBbUM7QUFTekMsSUFBTyxzQkFBUSxtQkFBbUI7QUFBQTtBQUFBLEVBQ2hDLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFNBQVM7QUFBQSxNQUNQO0FBQUEsUUFDRSxPQUFPO0FBQUEsUUFDUCxRQUFRLFNBQVM7QUFDZixrQkFBUSxPQUFPO0FBQUEsUUFDakI7QUFBQSxRQUNBLE1BQU07QUFBQSxVQUNKLE9BQU87QUFBQSxZQUNMLFFBQVE7QUFBQSxZQUNSLGVBQWU7QUFBQSxjQUNiLFFBQVE7QUFBQSxnQkFDTixRQUFRO0FBQUE7QUFBQSxnQkFDUixnQkFBZ0I7QUFBQSxjQUNsQjtBQUFBLGNBQ0EsVUFBVTtBQUFBLGdCQUNSO0FBQUEsZ0JBQ0E7QUFBQSxnQkFDQTtBQUFBLGdCQUNBO0FBQUEsZ0JBQ0E7QUFBQSxnQkFDQTtBQUFBLGdCQUNBO0FBQUEsZ0JBQ0E7QUFBQSxnQkFDQTtBQUFBLGdCQUNBO0FBQUEsZ0JBQ0E7QUFBQSxnQkFDQTtBQUFBLGdCQUNBO0FBQUEsZ0JBQ0E7QUFBQSxnQkFDQTtBQUFBLGdCQUNBO0FBQUEsY0FDRjtBQUFBLFlBQ0Y7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBO0FBQUEsUUFDRSxPQUFPO0FBQUEsUUFDUCxRQUFRLFNBQVM7QUFDZixrQkFBUSxPQUFPO0FBQUEsUUFDakI7QUFBQSxRQUNBLE1BQU07QUFBQSxVQUNKLE9BQU87QUFBQSxZQUNMLFFBQVE7QUFBQSxZQUNSLEtBQUs7QUFBQSxjQUNILE9BQU87QUFBQSxjQUNQLFNBQVMsQ0FBQyxLQUFLO0FBQUE7QUFBQSxjQUNmLFVBQVUsTUFBTTtBQUFBLFlBQ2xCO0FBQUEsWUFDQSxlQUFlO0FBQUEsY0FDYixVQUFVLENBQUMsVUFBVTtBQUFBLFlBQ3ZCO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsSUFDRCxTQUFTO0FBQUEsRUFDWDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3BDLGVBQWUsS0FBSyxRQUFRLGtDQUFXLGtCQUFrQjtBQUFBLE1BQ3pELFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxNQUMvQyxVQUFVLEtBQUssUUFBUSxrQ0FBVyxhQUFhO0FBQUEsTUFDL0MsVUFBVSxLQUFLLFFBQVEsa0NBQVcsYUFBYTtBQUFBLE1BQy9DLGFBQWEsS0FBSyxRQUFRLGtDQUFXLGdCQUFnQjtBQUFBLE1BQ3JELFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxJQUNqRDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLE9BQU87QUFBQSxNQUNMLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQ0EsVUFBU0EsTUFBSyxRQUFRLGlCQUFpQixFQUFFO0FBQUEsTUFDckQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsTUFBTTtBQUFBLElBQ0osU0FBUztBQUFBO0FBQUEsSUFDVCxhQUFhO0FBQUE7QUFBQSxJQUNiLFlBQVk7QUFBQTtBQUFBLElBQ1osS0FBSztBQUFBO0FBQUEsSUFDTCxVQUFVO0FBQUEsTUFDUixVQUFVO0FBQUE7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2pDLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
