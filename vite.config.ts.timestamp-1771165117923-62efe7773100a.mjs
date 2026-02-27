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
        entry: "electron/main.ts"
      }
      // Configuración de preload movida a una entrada separada para asegurar CJS
    ]),
    // Nueva entrada para preload, asegurando CommonJS
    electron({
      entry: "electron/preload.ts",
      onstart(options) {
        options.reload();
      },
      vite: {
        build: {
          outDir: "dist-electron",
          rollupOptions: {
            input: {
              preload: "electron/preload.ts"
            },
            output: {
              format: "cjs",
              // Forzar la salida como CommonJS
              entryFileNames: "[name].js"
              // Mantener el nombre preload.js
            },
            external: ["electron"]
            // Evitar empaquetar electron en el preload
          }
        }
      }
    }),
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
    port: 5173,
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxwcm94eFxcXFxPbmVEcml2ZVxcXFxEb2N1bWVudG9zXFxcXEVzY3JpdG9yaW9cXFxcU291bmRWaXppb24tbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxccHJveHhcXFxcT25lRHJpdmVcXFxcRG9jdW1lbnRvc1xcXFxFc2NyaXRvcmlvXFxcXFNvdW5kVml6aW9uLW1haW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3Byb3h4L09uZURyaXZlL0RvY3VtZW50b3MvRXNjcml0b3Jpby9Tb3VuZFZpemlvbi1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGVsZWN0cm9uIGZyb20gJ3ZpdGUtcGx1Z2luLWVsZWN0cm9uJztcbmltcG9ydCByZW5kZXJlciBmcm9tICd2aXRlLXBsdWdpbi1lbGVjdHJvbi1yZW5kZXJlcic7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gSW1wb3J0YSBkZWZpbmVDb25maWcgZGUgdml0ZXN0L2NvbmZpZyBwYXJhIGxhcyBvcGNpb25lcyBkZSB0ZXN0XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgYXMgZGVmaW5lVml0ZXN0Q29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZVZpdGVzdENvbmZpZyh7IC8vIFVzYSBkZWZpbmVWaXRlc3RDb25maWcgYXF1XHUwMEVEXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIGVsZWN0cm9uKFtcbiAgICAgIHtcbiAgICAgICAgZW50cnk6ICdlbGVjdHJvbi9tYWluLnRzJyxcbiAgICAgIH0sXG4gICAgICAvLyBDb25maWd1cmFjaVx1MDBGM24gZGUgcHJlbG9hZCBtb3ZpZGEgYSB1bmEgZW50cmFkYSBzZXBhcmFkYSBwYXJhIGFzZWd1cmFyIENKU1xuICAgIF0pLFxuICAgIC8vIE51ZXZhIGVudHJhZGEgcGFyYSBwcmVsb2FkLCBhc2VndXJhbmRvIENvbW1vbkpTXG4gICAgZWxlY3Ryb24oe1xuICAgICAgZW50cnk6ICdlbGVjdHJvbi9wcmVsb2FkLnRzJyxcbiAgICAgIG9uc3RhcnQob3B0aW9ucykge1xuICAgICAgICBvcHRpb25zLnJlbG9hZCgpO1xuICAgICAgfSxcbiAgICAgIHZpdGU6IHtcbiAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICBvdXREaXI6ICdkaXN0LWVsZWN0cm9uJyxcbiAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgICBwcmVsb2FkOiAnZWxlY3Ryb24vcHJlbG9hZC50cycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgIGZvcm1hdDogJ2NqcycsIC8vIEZvcnphciBsYSBzYWxpZGEgY29tbyBDb21tb25KU1xuICAgICAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ1tuYW1lXS5qcycsIC8vIE1hbnRlbmVyIGVsIG5vbWJyZSBwcmVsb2FkLmpzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXh0ZXJuYWw6IFsnZWxlY3Ryb24nXSwgLy8gRXZpdGFyIGVtcGFxdWV0YXIgZWxlY3Ryb24gZW4gZWwgcHJlbG9hZFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pLFxuICAgIHJlbmRlcmVyKCksXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICdAY29tcG9uZW50cyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9jb21wb25lbnRzJyksXG4gICAgICAnQHN0b3JlJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3N0b3JlJyksXG4gICAgICAnQHV0aWxzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3V0aWxzJyksXG4gICAgICAnQHR5cGVzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3R5cGVzJyksXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaS1kZWV6ZXInOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vYXBpLmRlZXplci5jb20nLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGktZGVlemVyLywgJycpLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICB0ZXN0OiB7XG4gICAgZ2xvYmFsczogdHJ1ZSwgLy8gVXNhIEFQSXMgZ2xvYmFsZXMgKGRlc2NyaWJlLCBpdCwgZXhwZWN0LCBldGMuKVxuICAgIGVudmlyb25tZW50OiAnanNkb20nLCAvLyBFbnRvcm5vIGRlIG5hdmVnYWRvciBzaW11bGFkbyBwYXJhIHRlc3RzIGRlIFJlYWN0XG4gICAgc2V0dXBGaWxlczogJy4vc2V0dXBUZXN0cy50cycsIC8vIEFyY2hpdm8gcGFyYSBjb25maWd1cmFjaVx1MDBGM24gZ2xvYmFsIGRlIHRlc3RzXG4gICAgY3NzOiB0cnVlLCAvLyBIYWJpbGl0YSBsYSBpbXBvcnRhY2lcdTAwRjNuIGRlIENTUyBlbiB0ZXN0c1xuICAgIGNvdmVyYWdlOiB7XG4gICAgICBwcm92aWRlcjogJ3Y4JywgLy8gbyAnaXN0YW5idWwnXG4gICAgICByZXBvcnRlcjogWydodG1sJywgJ3RleHQnLCAnanNvbiddLFxuICAgICAgZXhjbHVkZTogW1xuICAgICAgICAnbm9kZV9tb2R1bGVzLycsXG4gICAgICAgICdlbGVjdHJvbi8nLFxuICAgICAgICAnZGlzdC8nLFxuICAgICAgICAnZGlzdC1lbGVjdHJvbi8nLFxuICAgICAgICAnc3JjL21haW4udHN4JyxcbiAgICAgICAgJ3NyYy9BcHAudHN4JyxcbiAgICAgICAgJ3NyYy90eXBlcy8nLFxuICAgICAgICAnKi5jb25maWcudHMnLFxuICAgICAgICAnKi5jb25maWcuanMnLFxuICAgICAgICAncG9zdGNzcy5jb25maWcuanMnLFxuICAgICAgICAndGFpbHdpbmQuY29uZmlnLmpzJyxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLE9BQU8sV0FBVztBQUNsQixPQUFPLGNBQWM7QUFDckIsT0FBTyxjQUFjO0FBQ3JCLE9BQU8sVUFBVTtBQUdqQixTQUFTLGdCQUFnQiwwQkFBMEI7QUFQbkQsSUFBTSxtQ0FBbUM7QUFTekMsSUFBTyxzQkFBUSxtQkFBbUI7QUFBQTtBQUFBLEVBQ2hDLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFNBQVM7QUFBQSxNQUNQO0FBQUEsUUFDRSxPQUFPO0FBQUEsTUFDVDtBQUFBO0FBQUEsSUFFRixDQUFDO0FBQUE7QUFBQSxJQUVELFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxNQUNQLFFBQVEsU0FBUztBQUNmLGdCQUFRLE9BQU87QUFBQSxNQUNqQjtBQUFBLE1BQ0EsTUFBTTtBQUFBLFFBQ0osT0FBTztBQUFBLFVBQ0wsUUFBUTtBQUFBLFVBQ1IsZUFBZTtBQUFBLFlBQ2IsT0FBTztBQUFBLGNBQ0wsU0FBUztBQUFBLFlBQ1g7QUFBQSxZQUNBLFFBQVE7QUFBQSxjQUNOLFFBQVE7QUFBQTtBQUFBLGNBQ1IsZ0JBQWdCO0FBQUE7QUFBQSxZQUNsQjtBQUFBLFlBQ0EsVUFBVSxDQUFDLFVBQVU7QUFBQTtBQUFBLFVBQ3ZCO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELFNBQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDcEMsZUFBZSxLQUFLLFFBQVEsa0NBQVcsa0JBQWtCO0FBQUEsTUFDekQsVUFBVSxLQUFLLFFBQVEsa0NBQVcsYUFBYTtBQUFBLE1BQy9DLFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxNQUMvQyxVQUFVLEtBQUssUUFBUSxrQ0FBVyxhQUFhO0FBQUEsSUFDakQ7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixPQUFPO0FBQUEsTUFDTCxlQUFlO0FBQUEsUUFDYixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUNBLFVBQVNBLE1BQUssUUFBUSxpQkFBaUIsRUFBRTtBQUFBLE1BQ3JEO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLFNBQVM7QUFBQTtBQUFBLElBQ1QsYUFBYTtBQUFBO0FBQUEsSUFDYixZQUFZO0FBQUE7QUFBQSxJQUNaLEtBQUs7QUFBQTtBQUFBLElBQ0wsVUFBVTtBQUFBLE1BQ1IsVUFBVTtBQUFBO0FBQUEsTUFDVixVQUFVLENBQUMsUUFBUSxRQUFRLE1BQU07QUFBQSxNQUNqQyxTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJwYXRoIl0KfQo=
