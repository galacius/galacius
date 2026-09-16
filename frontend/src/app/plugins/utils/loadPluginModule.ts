/* eslint-disable preserve-caught-error */

/**
 * Dynamically loads a plugin bundle with fallback support for browsers
 * that don't natively support import maps in dynamic import() calls
 * (notably WebKitGTK on Linux, which may be several years behind).
 *
 * On modern browsers, uses native import() and import map resolution.
 * On older browsers, falls back to fetching the bundle as text, rewriting
 * bare specifiers to absolute vendor paths and relative specifiers to
 * absolute /api/plugins/... paths, then importing via Blob URL.
 */

/**
 * Maps bare module specifiers to their absolute vendor paths.
 * Must stay in sync with frontend/index.html's <script type="importmap">.
 */
export const BARE_SPECIFIER_MAP = {
  react: "/vendor/react.js",
  "react-dom": "/vendor/react-dom.js",
  "react/jsx-runtime": "/vendor/react-jsx-runtime.js",
  "@galacius/design-system": "/vendor/galacius/design-system.js",
  "@galacius/core": "/vendor/galacius/core.js",
  "@tanstack/react-query": "/vendor/tanstack/react-query.js",
} as const;

/**
 * Feature-detect import-map support. Returns true if the browser
 * supports import maps in dynamic import() calls.
 */
function supportsImportMap(): boolean {
  if (typeof HTMLScriptElement === "undefined") {
    return false;
  }
  return typeof (HTMLScriptElement.supports as unknown) === "function"
    ? (HTMLScriptElement.supports as (type: string) => boolean)("importmap")
    : false;
}

/**
 * Blanks out `//` line comments, `/* *\/` block comments, and the contents
 * of string/template literals, so the import-rewrite regex below never
 * matches specifier-shaped text sitting inside a comment or an unrelated
 * string literal (e.g. `"string with import('fake') inside"`). Quote
 * delimiters are preserved (as spaces would break the outer regex's own
 * `["']` matching), only the text *between* them is replaced.
 * This is a single-pass tokenizer, not a full JS parser — it only tracks
 * enough state (in-string / in-comment) to tell code from non-code, and
 * every replacement preserves length/newlines so character offsets used
 * elsewhere (source maps, error line numbers) stay stable.
 */
function maskComments(source: string): string {
  let out = "";
  let i = 0;
  const n = source.length;
  let stringChar: string | null = null;

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    if (stringChar) {
      if (ch === "\\" && i + 1 < n) {
        out += "  ";
        i += 2;
        continue;
      }
      if (ch === stringChar) {
        out += ch;
        stringChar = null;
        i += 1;
        continue;
      }
      out += ch === "\n" ? "\n" : " ";
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      stringChar = ch;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === "/" && next === "/") {
      // Line comment: blank it out up to (not including) the newline.
      while (i < n && source[i] !== "\n") {
        out += " ";
        i += 1;
      }
      continue;
    }

    if (ch === "/" && next === "*") {
      // Block comment: blank it out, preserving newlines for line-number stability.
      out += "  ";
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        out += source[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      if (i < n) {
        out += "  ";
        i += 2;
      }
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

/**
 * Resolves a relative specifier (e.g. "./x.js", "../sibling/y.js") against
 * the plugin's dist directory, collapsing "." and ".." segments correctly.
 * Manual segment resolution (rather than `new URL()`) so this doesn't depend
 * on the global URL constructor being intact in every runtime — plain string
 * slicing (`specifier.substring(1)`) mishandles anything beyond a single
 * "./" prefix, e.g. producing a malformed "dist./x.js" for "../x.js".
 */
function resolveRelativeSpecifier(pluginId: string, specifier: string): string {
  const segments = ["api", "plugins", pluginId, "dist"];
  for (const segment of specifier.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  return `/${segments.join("/")}`;
}

/**
 * Rewrites bare and relative import specifiers in plugin bundle source.
 * - Bare specifiers (e.g. "react", "@galacius/design-system") → absolute /vendor paths
 * - Relative specifiers (e.g. "./Chunk-XXXX.js", "../x.js") → absolute /api/plugins/{pluginId}/dist/... paths
 * Uses a simple regex approach (not a full JS parser) to match import/import() statements;
 * comments and string/template literals are masked first so the regex can't match inside them.
 */
function rewriteImportSpecifiers(
  bundleSource: string,
  pluginId: string,
  vendorMap: typeof BARE_SPECIFIER_MAP
): string {
  // Matches the KEYWORD + opening quote only (not the specifier text itself):
  // Static: `from "` / `from '`
  // Dynamic: `import(  "` / `import(  '`
  // Side-effect: `import "` / `import '`
  // The actual specifier is read from the ORIGINAL source afterward by scanning
  // to the matching closing quote — this way the regex never needs to "see"
  // specifier text, so it can safely run against a version of the source with
  // comments and string interiors blanked out (masked), without ever mistaking
  // specifier-shaped text inside a comment or an unrelated string literal for
  // a real import.
  const keywordRegex = /from\s+["']|import\s*\(\s*["']|import\s+["']/g;

  const masked = maskComments(bundleSource);

  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = keywordRegex.exec(masked)) !== null) {
    const fullMatch = match[0];
    const openQuotePos = match.index + fullMatch.length - 1;
    const quoteChar = fullMatch[fullMatch.length - 1];

    // Scan the ORIGINAL source for the matching closing quote, honoring backslash escapes.
    let closeQuotePos = -1;
    for (let i = openQuotePos + 1; i < bundleSource.length; i += 1) {
      if (bundleSource[i] === "\\") {
        i += 1;
        continue;
      }
      if (bundleSource[i] === quoteChar) {
        closeQuotePos = i;
        break;
      }
      if (bundleSource[i] === "\n") {
        // Unterminated string on this line — bail out, leave source untouched.
        break;
      }
    }

    if (closeQuotePos === -1) {
      // Nothing to rewrite; keep scanning after the opening quote.
      keywordRegex.lastIndex = openQuotePos + 1;
      continue;
    }

    const specifier = bundleSource.slice(openQuotePos + 1, closeQuotePos);
    const isRelative = specifier.startsWith(".");
    const newPath = isRelative
      ? resolveRelativeSpecifier(pluginId, specifier)
      : vendorMap[specifier as keyof typeof vendorMap];

    keywordRegex.lastIndex = closeQuotePos + 1;

    if (newPath === undefined) {
      continue;
    }

    result += bundleSource.slice(lastIndex, openQuotePos) + quoteChar + newPath + quoteChar;
    lastIndex = closeQuotePos + 1;
  }

  result += bundleSource.slice(lastIndex);

  return result;
}

/**
 * Loads a plugin bundle, with fallback for browsers lacking import-map support.
 * If import maps are supported: calls import() directly (fast path).
 * If not: fetches bundle as text, rewrites import specifiers, and imports via Blob URL.
 *
 * @param pluginId The plugin ID
 * @param bundleChecksum The bundle checksum for cache-busting (optional)
 * @returns The loaded module (same as what import() returns)
 */
export async function loadPluginModule(
  pluginId: string,
  bundleChecksum?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const cacheVersion = bundleChecksum?.substring(0, 8) || "unknown";
  const bundleUrl = `/api/plugins/${pluginId}/dist/index.js?v=${cacheVersion}`;

  // Fast path: browser supports import maps natively
  if (supportsImportMap()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return import(/* @vite-ignore */ bundleUrl as any);
  }

  // Fallback path: fetch, rewrite, and import via Blob URL
  console.info(`[loadPluginModule] import-map not supported; using fallback path for ${pluginId}`);

  try {
    const response = await fetch(bundleUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch plugin bundle: ${response.status} ${response.statusText}`);
    }

    let bundleSource = await response.text();

    // Rewrite bare and relative import specifiers
    bundleSource = rewriteImportSpecifiers(bundleSource, pluginId, BARE_SPECIFIER_MAP);

    // Create Blob URL and import
    const blob = new Blob([bundleSource], { type: "application/javascript" });
    const blobUrl = URL.createObjectURL(blob);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let module: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      module = await import(/* @vite-ignore */ blobUrl as any);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }

    return module;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load plugin module ${pluginId} via fallback: ${msg}`);
  }
}
