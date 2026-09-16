#!/usr/bin/env node
// Regenerates frontend/public/vendor/**/*.js from the actual installed/built
// module each shim re-exports, instead of a human hand-copying
// Object.keys(). Run via `pnpm generate:vendor` directly, or implicitly via
// `pnpm build:core:fe` (its last step — see package.json), which in turn is
// wired into `build:app:fe` / `build:core`.
//
// Each shim redirects a bare specifier (react, react-dom,
// @galacius/design-system, ...) to window.__GALACIUS_VENDOR__, the host's
// own singleton module instances (set up in src/expose/index.tsx), so
// dynamically-imported plugin bundles share exactly one instance of each —
// required for hooks/context/portals and for react-query's Context object
// identity to work when a plugin component mounts inline in the host's
// fiber tree.

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const frontendDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.dirname(frontendDir);
const vendorDir = path.join(frontendDir, "public", "vendor");

// Keys that leak out of Node's CJS/ESM interop (cjs-module-lexer) or are
// explicitly marked internal-only by the library — never re-export these.
const isInternal = (key) => key === "default" || key === "module.exports" || key.startsWith("__");

async function namedExports(specifier) {
  const mod = await import(specifier);
  return Object.keys(mod)
    .filter((k) => !isInternal(k))
    .sort();
}

function renderShim({ rationale, hasDefault, exportName, globalKey, sourcePath = [], names }) {
  const commentBody = rationale
    .trim()
    .split("\n")
    .map((line) => (line ? ` * ${line}` : " *"))
    .join("\n");
  const header = `/*
${commentBody}
 *
 * GENERATED FILE — do not hand-edit. Run \`pnpm generate:vendor\` to refresh
 * (see frontend/scripts/generate-vendor-shims.mjs).
 */
if (!window.__GALACIUS_VENDOR__) {
  throw new Error(
    "window.__GALACIUS_VENDOR__ is not set — src/main.tsx must run before any plugin is dynamically imported."
  );
}
const ${exportName} = window.__GALACIUS_VENDOR__.${[globalKey, ...sourcePath].join(".")};
`;

  const defaultExport = hasDefault ? `\nexport default ${exportName};\n` : "";

  let namedExportBlock = "";
  if (names.length) {
    const singleLine = `export const { ${names.join(", ")} } = ${exportName};`;
    namedExportBlock =
      names.length === 1 && singleLine.length <= 80
        ? `\n${singleLine}\n`
        : `\nexport const {\n${names.map((n) => `  ${n},`).join("\n")}\n} = ${exportName};\n`;
  }

  return header + defaultExport + namedExportBlock;
}

function pathToFileURL(p) {
  return new URL(`file://${p}`).href;
}

const SEE_REACT_JS = "See ../react.js for why this indirection exists.";

const targets = [
  {
    specifier: "react",
    globalKey: "react",
    exportName: "React",
    hasDefault: true,
    outFile: path.join(vendorDir, "react.js"),
    rationale: `Vendor shim: redirects the bare "react" specifier (left in place by plugin
bundlers that mark react as external) to the host app's own React
singleton, exposed on window.__GALACIUS_VENDOR__ by src/main.tsx before
any plugin can be dynamically imported. This keeps hooks/context/portals
working correctly when a plugin component is mounted inline in the host's
fiber tree, since React requires exactly one module instance to do so.`,
  },
  {
    specifier: "react-dom",
    globalKey: "reactDom",
    exportName: "ReactDOM",
    hasDefault: true,
    outFile: path.join(vendorDir, "react-dom.js"),
    rationale: `Vendor shim for the "react-dom" bare specifier. ${SEE_REACT_JS}`,
  },
  {
    specifier: "react/jsx-runtime",
    globalKey: "reactJsxRuntime",
    exportName: "jsxRuntime",
    hasDefault: false,
    outFile: path.join(vendorDir, "react-jsx-runtime.js"),
    rationale: `Vendor shim for the "react/jsx-runtime" bare specifier. ${SEE_REACT_JS}`,
  },
  {
    specifier: "@tanstack/react-query",
    globalKey: "reactQuery",
    exportName: "ReactQuery",
    hasDefault: false,
    outFile: path.join(vendorDir, "tanstack", "react-query.js"),
    rationale: `Vendor shim for the "@tanstack/react-query" bare specifier. ${SEE_REACT_JS}

Sharing the host's own react-query module instance (not just the same
QueryClient value) is required, not optional: QueryClientProvider/useQuery
read a React Context object created inside this module, and a Context
object is only == itself across module instances if there is exactly one
loaded instance. A plugin bundling its own copy of react-query would get
"No QueryClient set" at runtime even though the host's provider wraps it.`,
  },
  {
    specifier: pathToFileURL(path.join(repoRoot, "packages", "design-system", "dist", "index.js")),
    globalKey: "designSystem",
    exportName: "DesignSystem",
    hasDefault: false,
    outFile: path.join(vendorDir, "galacius", "design-system.js"),
    rationale: `Vendor shim for the "@galacius/design-system" bare specifier. ${SEE_REACT_JS}`,
  },
  {
    specifier: pathToFileURL(
      path.join(repoRoot, "packages", "core", "frontend", "dist", "index.js")
    ),
    globalKey: "core",
    exportName: "Core",
    hasDefault: false,
    outFile: path.join(vendorDir, "galacius", "core.js"),
    rationale: `Vendor shim for the "@galacius/core" bare specifier. ${SEE_REACT_JS}

Named exports mirror what @galacius/core's own dist/index.js exports:
clusterWideAPI (hooks/functions valid only within a single cluster's view)
and appWideAPI (capabilities that aren't cluster-scoped, e.g.
registerStylesheets) — see src/expose/index.tsx.`,
  },
];

async function main() {
  for (const target of targets) {
    let names;
    try {
      names = await namedExports(target.specifier);
    } catch (err) {
      console.error(
        `Failed to import ${target.specifier}. ` +
          `Build it first (pnpm build:ds / pnpm build:core:fe) if it's a workspace package.\n${err.message}`
      );
      process.exitCode = 1;
      continue;
    }
    const shim = renderShim({ ...target, names });
    await mkdir(path.dirname(target.outFile), { recursive: true });
    await writeFile(target.outFile, shim);
    console.log(
      `wrote ${path.relative(repoRoot, target.outFile)} (${names.length} named export${names.length === 1 ? "" : "s"}${target.hasDefault ? " + default" : ""})`
    );
  }
}

main();
