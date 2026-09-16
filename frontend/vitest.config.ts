import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(import.meta.dirname, "./src") },
      {
        find: "@wailsjs",
        replacement: path.resolve(import.meta.dirname, "./src/__mocks__/wailsjs"),
      },
      {
        find: /.*\/wailsjs\/(.*)/,
        replacement: `${path.resolve(import.meta.dirname, "./src/__mocks__/wailsjs")}/$1`,
      },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "../plugins/*/frontend/src/**/*.{test,spec}.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "html", ["text-summary", { file: "./summary.txt" }]],
      include: ["src/**/*.{ts,tsx}", "../plugins/*/frontend/src/**/*.{ts,tsx}"],
      exclude: ["src/wailsjs/**", "src/__mocks__/**", "src/**/*.d.ts"],
    },
  },
});
