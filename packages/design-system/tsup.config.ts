import { defineConfig } from "tsup";
import fs from "node:fs";
import path from "node:path";
import { visualizer, prepareVisualizerData } from "esbuild-visualizer";

const shouldAnalyze = process.env.ANALYZE === "true";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "atoms/index": "src/atoms/index.ts",
    "components/index": "src/components/index.ts",
    "hooks/index": "src/hooks/index.ts",
    "utils/index": "src/utils/index.ts",
    "libs/index": "src/libs/index.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: true,
  clean: true,
  treeshake: true,
  metafile: shouldAnalyze,
  external: [
    "react",
    "react-dom",
    "tailwindcss",
    "sonner",
    "@tanstack/react-query",
    "@base-ui/react",
    "next-themes",
    "xterm",
    "@xterm/addon-fit",
    "@xterm/addon-search",
    "tw-animate-css",
    "shadcn/tailwind.css",
    "@fontsource-variable/inter",
    "@fontsource-variable/space-grotesk",
  ],
  onSuccess: async () => {
    // Copy style.css and its partials to dist folder
    const cssFiles = [
      "style.css",
      "styles.typography.css",
      "styles.animation.css",
      "styles.palette.css",
    ];
    cssFiles.forEach((file) => {
      fs.copyFileSync(path.join(__dirname, "src", file), path.join(__dirname, "dist", file));
    });

    // Build the styles.js manually (just a CSS import side-effect)
    const stylesJs = path.join(__dirname, "dist", "styles.js");
    fs.writeFileSync(stylesJs, 'import "./style.css";\n');

    // Create .d.ts files for all modules (re-export from source for type info)
    const modules = [
      "index",
      "atoms/index",
      "components/index",
      "hooks/index",
      "utils/index",
      "libs/index",
      "styles",
    ];
    modules.forEach((module) => {
      const dtsPath = path.join(__dirname, "dist", `${module}.d.ts`);
      const dir = path.dirname(dtsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Point types to source files
      const srcModule =
        module === "index"
          ? "index.ts"
          : module.endsWith("index")
            ? `${module.split("/")[0]}/index.ts`
            : `${module}.ts`;
      fs.writeFileSync(dtsPath, `export * from '../src/${srcModule}';\n`);
    });

    // Generate bundle report (treemap HTML + raw-data JSON) from the esbuild metafile
    const metafilePath = path.join(__dirname, "dist", "metafile-esm.json");
    if (shouldAnalyze && fs.existsSync(metafilePath)) {
      const statsDir = path.join(__dirname, "dist", "stats");
      fs.mkdirSync(statsDir, { recursive: true });

      const metadata = JSON.parse(fs.readFileSync(metafilePath, "utf-8"));

      const html = await visualizer(metadata, {
        title: "@galacius/design-system Bundle Report",
        template: "treemap",
      });
      fs.writeFileSync(path.join(statsDir, "bundle-report.html"), html);
      fs.writeFileSync(path.join(statsDir, "bundle-stats.json"), prepareVisualizerData(metadata));
      fs.renameSync(metafilePath, path.join(statsDir, "metafile-esm.json"));
    }
  },
});
