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
                // Main process uses ESM
                entryFileNames: "main.js"
              },
              external: ["electron", "express", "axios", "dotenv", "music-metadata", "better-sqlite3"]
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
              // FORCE CJS for preload
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxwcm94eFxcXFxPbmVEcml2ZVxcXFxEb2N1bWVudG9zXFxcXEVzY3JpdG9yaW9cXFxcU291bmRWaXppb24tbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxccHJveHhcXFxcT25lRHJpdmVcXFxcRG9jdW1lbnRvc1xcXFxFc2NyaXRvcmlvXFxcXFNvdW5kVml6aW9uLW1haW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3Byb3h4L09uZURyaXZlL0RvY3VtZW50b3MvRXNjcml0b3Jpby9Tb3VuZFZpemlvbi1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGVsZWN0cm9uIGZyb20gJ3ZpdGUtcGx1Z2luLWVsZWN0cm9uJztcbmltcG9ydCByZW5kZXJlciBmcm9tICd2aXRlLXBsdWdpbi1lbGVjdHJvbi1yZW5kZXJlcic7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gSW1wb3J0YSBkZWZpbmVDb25maWcgZGUgdml0ZXN0L2NvbmZpZyBwYXJhIGxhcyBvcGNpb25lcyBkZSB0ZXN0XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgYXMgZGVmaW5lVml0ZXN0Q29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZVZpdGVzdENvbmZpZyh7IC8vIFVzYSBkZWZpbmVWaXRlc3RDb25maWcgYXF1XHUwMEVEXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIGVsZWN0cm9uKFtcbiAgICAgIHtcbiAgICAgICAgZW50cnk6ICdlbGVjdHJvbi9tYWluLnRzJyxcbiAgICAgICAgb25zdGFydChvcHRpb25zKSB7XG4gICAgICAgICAgb3B0aW9ucy5yZWxvYWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdml0ZToge1xuICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uJyxcbiAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgZm9ybWF0OiAnZXMnLCAvLyBNYWluIHByb2Nlc3MgdXNlcyBFU01cbiAgICAgICAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ21haW4uanMnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBleHRlcm5hbDogWydlbGVjdHJvbicsICdleHByZXNzJywgJ2F4aW9zJywgJ2RvdGVudicsICdtdXNpYy1tZXRhZGF0YScsICdiZXR0ZXItc3FsaXRlMyddLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZW50cnk6ICdlbGVjdHJvbi9wcmVsb2FkLnRzJyxcbiAgICAgICAgb25zdGFydChvcHRpb25zKSB7XG4gICAgICAgICAgb3B0aW9ucy5yZWxvYWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdml0ZToge1xuICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uJyxcbiAgICAgICAgICAgIGxpYjoge1xuICAgICAgICAgICAgICBlbnRyeTogJ2VsZWN0cm9uL3ByZWxvYWQudHMnLFxuICAgICAgICAgICAgICBmb3JtYXRzOiBbJ2NqcyddLCAvLyBGT1JDRSBDSlMgZm9yIHByZWxvYWRcbiAgICAgICAgICAgICAgZmlsZU5hbWU6ICgpID0+ICdwcmVsb2FkLmNqcycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgICAgICBleHRlcm5hbDogWydlbGVjdHJvbiddLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICBdKSxcbiAgICByZW5kZXJlcigpLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgICAnQGNvbXBvbmVudHMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvY29tcG9uZW50cycpLFxuICAgICAgJ0BzdG9yZSc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9zdG9yZScpLFxuICAgICAgJ0B1dGlscyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy91dGlscycpLFxuICAgICAgJ0B0eXBlcyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy90eXBlcycpLFxuICAgIH0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxOTksXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGktZGVlemVyJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2FwaS5kZWV6ZXIuY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLWRlZXplci8sICcnKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsIC8vIFVzYSBBUElzIGdsb2JhbGVzIChkZXNjcmliZSwgaXQsIGV4cGVjdCwgZXRjLilcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJywgLy8gRW50b3JubyBkZSBuYXZlZ2Fkb3Igc2ltdWxhZG8gcGFyYSB0ZXN0cyBkZSBSZWFjdFxuICAgIHNldHVwRmlsZXM6ICcuL3NldHVwVGVzdHMudHMnLCAvLyBBcmNoaXZvIHBhcmEgY29uZmlndXJhY2lcdTAwRjNuIGdsb2JhbCBkZSB0ZXN0c1xuICAgIGNzczogdHJ1ZSwgLy8gSGFiaWxpdGEgbGEgaW1wb3J0YWNpXHUwMEYzbiBkZSBDU1MgZW4gdGVzdHNcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICd2OCcsIC8vIG8gJ2lzdGFuYnVsJ1xuICAgICAgcmVwb3J0ZXI6IFsnaHRtbCcsICd0ZXh0JywgJ2pzb24nXSxcbiAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgJ25vZGVfbW9kdWxlcy8nLFxuICAgICAgICAnZWxlY3Ryb24vJyxcbiAgICAgICAgJ2Rpc3QvJyxcbiAgICAgICAgJ2Rpc3QtZWxlY3Ryb24vJyxcbiAgICAgICAgJ3NyYy9tYWluLnRzeCcsXG4gICAgICAgICdzcmMvQXBwLnRzeCcsXG4gICAgICAgICdzcmMvdHlwZXMvJyxcbiAgICAgICAgJyouY29uZmlnLnRzJyxcbiAgICAgICAgJyouY29uZmlnLmpzJyxcbiAgICAgICAgJ3Bvc3Rjc3MuY29uZmlnLmpzJyxcbiAgICAgICAgJ3RhaWx3aW5kLmNvbmZpZy5qcycsXG4gICAgICBdLFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxjQUFjO0FBQ3JCLE9BQU8sY0FBYztBQUNyQixPQUFPLFVBQVU7QUFHakIsU0FBUyxnQkFBZ0IsMEJBQTBCO0FBUG5ELElBQU0sbUNBQW1DO0FBU3pDLElBQU8sc0JBQVEsbUJBQW1CO0FBQUE7QUFBQSxFQUNoQyxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsTUFDUDtBQUFBLFFBQ0UsT0FBTztBQUFBLFFBQ1AsUUFBUSxTQUFTO0FBQ2Ysa0JBQVEsT0FBTztBQUFBLFFBQ2pCO0FBQUEsUUFDQSxNQUFNO0FBQUEsVUFDSixPQUFPO0FBQUEsWUFDTCxRQUFRO0FBQUEsWUFDUixlQUFlO0FBQUEsY0FDYixRQUFRO0FBQUEsZ0JBQ04sUUFBUTtBQUFBO0FBQUEsZ0JBQ1IsZ0JBQWdCO0FBQUEsY0FDbEI7QUFBQSxjQUNBLFVBQVUsQ0FBQyxZQUFZLFdBQVcsU0FBUyxVQUFVLGtCQUFrQixnQkFBZ0I7QUFBQSxZQUN6RjtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0E7QUFBQSxRQUNFLE9BQU87QUFBQSxRQUNQLFFBQVEsU0FBUztBQUNmLGtCQUFRLE9BQU87QUFBQSxRQUNqQjtBQUFBLFFBQ0EsTUFBTTtBQUFBLFVBQ0osT0FBTztBQUFBLFlBQ0wsUUFBUTtBQUFBLFlBQ1IsS0FBSztBQUFBLGNBQ0gsT0FBTztBQUFBLGNBQ1AsU0FBUyxDQUFDLEtBQUs7QUFBQTtBQUFBLGNBQ2YsVUFBVSxNQUFNO0FBQUEsWUFDbEI7QUFBQSxZQUNBLGVBQWU7QUFBQSxjQUNiLFVBQVUsQ0FBQyxVQUFVO0FBQUEsWUFDdkI7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELFNBQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDcEMsZUFBZSxLQUFLLFFBQVEsa0NBQVcsa0JBQWtCO0FBQUEsTUFDekQsVUFBVSxLQUFLLFFBQVEsa0NBQVcsYUFBYTtBQUFBLE1BQy9DLFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxNQUMvQyxVQUFVLEtBQUssUUFBUSxrQ0FBVyxhQUFhO0FBQUEsSUFDakQ7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixPQUFPO0FBQUEsTUFDTCxlQUFlO0FBQUEsUUFDYixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUNBLFVBQVNBLE1BQUssUUFBUSxpQkFBaUIsRUFBRTtBQUFBLE1BQ3JEO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLFNBQVM7QUFBQTtBQUFBLElBQ1QsYUFBYTtBQUFBO0FBQUEsSUFDYixZQUFZO0FBQUE7QUFBQSxJQUNaLEtBQUs7QUFBQTtBQUFBLElBQ0wsVUFBVTtBQUFBLE1BQ1IsVUFBVTtBQUFBO0FBQUEsTUFDVixVQUFVLENBQUMsUUFBUSxRQUFRLE1BQU07QUFBQSxNQUNqQyxTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIl0KfQo=
