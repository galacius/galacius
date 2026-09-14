import { prepareVisualizerData, visualizer } from "esbuild-visualizer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Options } from "tsup";

/**
 * Externals every plugin frontend must share with the host's own module
 * instances (resolved via the host's import map + vendor shims) rather than
 * bundling its own copy — required for react-dom/@tanstack/react-query
 * context objects to resolve correctly when a plugin component is mounted
 * inline in the host's fiber tree.
 */
export const PLUGIN_SHARED_EXTERNALS = [
  "react",
  "react-dom",
  "@galacius/design-system",
  "@tanstack/react-query",
  "@galacius/core",
] as const;

const require = createRequire(import.meta.url);

// @tailwindcss/cli's package.json only exports "./package.json" (no "." entry),
// so resolve its directory that way, then locate the CLI entry via its own
// declared "bin" path rather than hardcoding "dist/index.mjs".
function resolveTailwindCliEntry(): string {
  const tailwindCliPkg = JSON.parse(
    fs.readFileSync(require.resolve("@tailwindcss/cli/package.json"), "utf-8")
  ) as { bin: { tailwindcss: string } };
  return path.join(
    path.dirname(require.resolve("@tailwindcss/cli/package.json")),
    tailwindCliPkg.bin.tailwindcss
  );
}

// Compiles a .css file through the local Tailwind CLI at bundle time (its
// default `-o` is stdout — logs go to stderr, so stdout is clean CSS) instead
// of relying on a separate `build:css` pre-build step. This keeps src/style.css
// as hand-authored, git-tracked source rather than a build artifact, and means
// `pnpm build` alone is enough — no per-plugin build-script wiring needed to
// add another registered view's stylesheet.
//
// tsup registers its own postcss-based onLoad for `/\.css$/` with no namespace
// restriction, so it matches virtual modules in any namespace, not just "file"
// — and since it's set up before this plugin, it wins the race for any path
// still ending in ".css". Suffixing the resolved virtual path so it no longer
// matches `/\.css$/` sidesteps that entirely (the mismatch is on the regex,
// not just the namespace).
const RESOLVED_SUFFIX = ".tw-inline";

function createInlineTailwindPlugin(
  pluginRoot: string
): NonNullable<Options["esbuildPlugins"]>[number] {
  const tailwindCliEntry = resolveTailwindCliEntry();
  return {
    name: "inline-tailwind",
    setup(build) {
      build.onResolve({ filter: /\.css$/ }, (args) => {
        if (args.namespace !== "file") return;
        const absPath = path.isAbsolute(args.path)
          ? args.path
          : path.join(args.resolveDir, args.path);
        return { path: absPath + RESOLVED_SUFFIX, namespace: "inline-tailwind" };
      });
      build.onLoad({ filter: /\.tw-inline$/, namespace: "inline-tailwind" }, (args) => {
        const realPath = args.path.slice(0, -RESOLVED_SUFFIX.length);
        const contents = execFileSync(
          process.execPath,
          [tailwindCliEntry, "-i", realPath, "-m", "--cwd", pluginRoot],
          { encoding: "utf-8" }
        );
        return { contents, loader: "text" as const };
      });
    },
  };
}

export interface CreatePluginTsupConfigOptions {
  /** Absolute path to the plugin frontend package's root directory (e.g.
   * `path.dirname(fileURLToPath(import.meta.url))` from the plugin's own
   * `tsup.config.ts`). Used as the Tailwind CLI's `--cwd` and to resolve the
   * package name for the bundle-report title. */
  pluginRoot: string;
  /** Defaults to `["src/index.ts"]`. */
  entry?: string[];
  /** Extra externals beyond {@link PLUGIN_SHARED_EXTERNALS}. */
  external?: string[];
  /** Defaults to `process.env.ANALYZE === "true"`. */
  analyze?: boolean;
}

/**
 * Shared tsup config for galacius plugin frontends: bundles `src/index.ts`
 * to a single ESM file, externalizing the host-shared runtime deps, inlining
 * Tailwind-compiled CSS as text (see {@link createInlineTailwindPlugin}), and
 * optionally emitting a bundle-analysis report to `dist/stats/` when
 * `ANALYZE=true`.
 */
export function createPluginTsupConfig(options: CreatePluginTsupConfigOptions): Options {
  const { pluginRoot, entry = ["src/index.ts"], external = [], analyze } = options;
  const shouldAnalyze = analyze ?? process.env.ANALYZE === "true";
  const pkg = JSON.parse(fs.readFileSync(path.join(pluginRoot, "package.json"), "utf-8")) as {
    name: string;
  };

  return {
    entry,
    format: ["esm"],
    outDir: "dist",
    target: "es2020",
    splitting: true,
    sourcemap: false,
    clean: true,
    metafile: shouldAnalyze,
    external: [...PLUGIN_SHARED_EXTERNALS, ...external],
    // Tailwind CSS is compiled in-memory by the inline-tailwind esbuild plugin
    // (above) and imported as raw text via `import("./style.css")`, so it ends
    // up embedded directly in dist/index.js instead of shipped as a separate
    // stylesheet asset. Must be set here (tsup's top-level `loader` option)
    // rather than inside esbuildOptions — tsup's own CSS-handling esbuild
    // plugin reads this value before esbuildOptions runs.
    loader: {
      ".css": "text",
    },
    // tsup's own esbuild-plugin array (postcss, svelte, etc.) is built statically
    // before the build starts; a plugin pushed onto `options.plugins` inside
    // esbuildOptions arrives too late; esbuild has already snapshotted the array
    // for setup. `esbuildPlugins` is tsup's supported hook for adding one upfront.
    esbuildPlugins: [createInlineTailwindPlugin(pluginRoot)],
    esbuildOptions: (esbuildOptions) => {
      esbuildOptions.banner = {
        js: "/* Plugin bundle - loaded dynamically */",
      };
    },
    onSuccess: async () => {
      // Generate bundle report (treemap HTML + raw-data JSON) from the esbuild metafile
      const metafilePath = path.join(pluginRoot, "dist", "metafile-esm.json");
      if (shouldAnalyze && fs.existsSync(metafilePath)) {
        const statsDir = path.join(pluginRoot, "dist", "stats");
        fs.mkdirSync(statsDir, { recursive: true });

        const metadata = JSON.parse(fs.readFileSync(metafilePath, "utf-8"));

        const html = await visualizer(metadata, {
          title: `${pkg.name} Bundle Report`,
          template: "treemap",
        });
        fs.writeFileSync(path.join(statsDir, "bundle-report.html"), html);
        fs.writeFileSync(path.join(statsDir, "bundle-stats.json"), prepareVisualizerData(metadata));
        fs.renameSync(metafilePath, path.join(statsDir, "metafile-esm.json"));
      }
    },
  };
}
