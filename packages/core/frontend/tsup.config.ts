import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "tsup-preset": "src/build/tsupPreset.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "tsup", "esbuild", "esbuild-visualizer", "@tailwindcss/cli"],
});
