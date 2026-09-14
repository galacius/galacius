import type { Plugin } from "vite";

// In `wails dev`, requests the webview makes (e.g. a plugin's dynamic
// `import("/api/plugins/<plugin-id>/dist/index.js")`) are proxied by the Wails Go
// asset server to this Vite dev server first, falling back to our Go
// plugin-asset handler only when Vite responds 404/405. Vite's own SPA
// history fallback intercepts any unmatched request whose Accept header
// includes html/`*/*` (which a dynamic import's fetch does) and serves
// index.html with a 200, so the Go fallback never triggers and the browser
// gets `text/html` where it expected a JS module. Short-circuit `/api/*`
// with a real 404 before Vite's internal middlewares run so the Wails
// fallback engages correctly.
export function pluginApiNotFound(): Plugin {
  return {
    name: "plugin-api-not-found",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/api/")) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        next();
      });
    },
  };
}
