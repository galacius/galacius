import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import { pluginApiNotFound } from "./plugins/plugin-api-not-found";

const shouldAnalyze = process.env.ANALYZE === "true";

export default defineConfig({
  plugins: [
    pluginApiNotFound(),
    react(),
    tailwindcss(),
    ...(shouldAnalyze
      ? [
          visualizer({
            filename: "dist/stats/bundle-report.html",
            open: false,
            gzipSize: true,
            brotliSize: true,
            template: "treemap",
          }),
          visualizer({
            filename: "dist/stats/bundle-stats.json",
            gzipSize: true,
            brotliSize: true,
            template: "raw-data",
          }),
        ]
      : []),
  ],
  define: {
    __NODE_VERSION__: JSON.stringify(process.version),
  },
  resolve: {
    alias: {
      "@wailsjs": path.resolve(import.meta.dirname, "./wailsjs"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("@xterm")) {
            return "xterm";
          }
        },
      },
    },
  },
  server: {
    watch: {
      ignored: [
        "!**/node_modules/@galacius/design-system/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/__tests__/**",
      ],
    },
  },
});
