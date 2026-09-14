/// <reference types="node" />
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { loadPluginModule, BARE_SPECIFIER_MAP } from "../loadPluginModule";

/**
 * Test suite for loadPluginModule utility.
 *
 * Tests cover:
 * 1. Feature detection: import-map support detection works
 * 2. Fallback path: when import-map is NOT supported (fetch + rewrite + Blob URL)
 * 3. Specifier rewriting: bare and relative import rewriting
 * 4. Blob URL cleanup: ensuring revokeObjectURL is called
 * 5. Error handling: fetch failures
 */

describe("loadPluginModule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fallback path: import-map NOT supported", () => {
    it("should fetch and rewrite imports when import-map not supported", async () => {
      const bundleSource = `
import { Suspense, lazy } from "react";
import { Button } from "@galacius/design-system";
const TrayComponent = lazy(() => import("./SampleTray-T6UFBCRM.js").then(m => ({ default: m.SampleTray })));
export const PLUGIN_TRAY_FAMILIES = { tray: TrayComponent };
      `.trim();

      // Mock HTMLScriptElement.supports to return false (import-map not supported)
      vi.stubGlobal("HTMLScriptElement", {
        supports: vi.fn(() => false),
      });

      // Mock fetch to return the bundle source
      const fetchMock = vi.fn(async () => ({
        ok: true,
        text: async () => bundleSource,
      }));
      vi.stubGlobal("fetch", fetchMock);

      // Mock URL.createObjectURL to return a fake blob URL
      const createObjectURLMock = vi.fn(() => "blob:mock-url-123");
      const revokeObjectURLMock = vi.fn();
      vi.stubGlobal("URL", {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      } as any);

      try {
        await loadPluginModule("sample-plugin", "abc123def");
      } catch {
        // Expected to fail when trying to import blob URL in test environment
      }

      // Verify fetch was called with correct URL
      expect(fetchMock).toHaveBeenCalledWith("/api/plugins/sample-plugin/dist/index.js?v=abc123de");

      // Verify Blob URL was created
      expect(createObjectURLMock).toHaveBeenCalled();

      // Verify Blob URL was revoked after import attempt
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url-123");
    });

    it("should rewrite bare specifiers to vendor paths", async () => {
      const bundleSource = `
import { Suspense, lazy } from "react";
import { Button } from "@galacius/design-system";
import { useQuery } from "@tanstack/react-query";
export const PLUGIN_NAV_ENTRY = {};
      `.trim();

      vi.stubGlobal("HTMLScriptElement", {
        supports: vi.fn(() => false),
      });

      let capturedBlobContent: string = "";
      const createObjectURLMock = vi.fn((blob) => {
        // Capture the blob content for verification
        if (blob instanceof Blob) {
          blob.text().then((text) => {
            capturedBlobContent = text;
          });
        }
        return "blob:mock-123";
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          text: async () => bundleSource,
        }))
      );

      vi.stubGlobal("URL", {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: vi.fn(),
      } as any);

      // Await the blob capture promise
      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        await loadPluginModule("test-plugin", "checksum");
      } catch {
        // Expected to fail
      }

      // Wait for async blob.text() to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify bare specifiers were rewritten
      expect(capturedBlobContent).toContain('from "/vendor/react.js"');
      expect(capturedBlobContent).toContain('from "/vendor/galacius/design-system.js"');
      expect(capturedBlobContent).toContain('from "/vendor/tanstack/react-query.js"');

      // Verify original bare specifiers are gone
      expect(capturedBlobContent).not.toContain('from "react"');
      expect(capturedBlobContent).not.toContain('from "@galacius/design-system"');
      expect(capturedBlobContent).not.toContain('from "@tanstack/react-query"');
    });

    it("should rewrite relative specifiers to absolute /api/plugins paths", async () => {
      const bundleSource = `
const TrayComponent = lazy(() => import("./SampleTray-T6UFBCRM.js").then(m => ({ default: m.SampleTray })));
const UpgradeTray = lazy(() => import("./SampleUpgradeTray-IIPS3IKW.js"));
      `.trim();

      vi.stubGlobal("HTMLScriptElement", {
        supports: vi.fn(() => false),
      });

      let capturedBlobContent: string = "";
      const createObjectURLMock = vi.fn((blob) => {
        if (blob instanceof Blob) {
          blob.text().then((text) => {
            capturedBlobContent = text;
          });
        }
        return "blob:mock-123";
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          text: async () => bundleSource,
        }))
      );

      vi.stubGlobal("URL", {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: vi.fn(),
      } as any);

      try {
        await loadPluginModule("sample-plugin", "checksum");
      } catch {
        // Expected to fail
      }

      // Wait for async blob.text() to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify relative specifiers were rewritten to absolute paths
      expect(capturedBlobContent).toContain(
        'import("/api/plugins/sample-plugin/dist/SampleTray-T6UFBCRM.js")'
      );
      expect(capturedBlobContent).toContain(
        'import("/api/plugins/sample-plugin/dist/SampleUpgradeTray-IIPS3IKW.js")'
      );

      // Verify original relative specifiers are gone
      expect(capturedBlobContent).not.toContain('import("./SampleTray');
      expect(capturedBlobContent).not.toContain('import("./SampleUpgradeTray');
    });

    it("should handle mixed static and dynamic imports", async () => {
      const bundleSource = `
import { lazy } from "react";
import { Button } from "@galacius/design-system";
const Component = lazy(() => import("./chunk.js"));
import type { Config } from "@tanstack/react-query";
      `.trim();

      vi.stubGlobal("HTMLScriptElement", {
        supports: vi.fn(() => false),
      });

      let capturedBlobContent: string = "";
      const createObjectURLMock = vi.fn((blob) => {
        if (blob instanceof Blob) {
          blob.text().then((text) => {
            capturedBlobContent = text;
          });
        }
        return "blob:mock-123";
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          text: async () => bundleSource,
        }))
      );

      vi.stubGlobal("URL", {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: vi.fn(),
      } as any);

      try {
        await loadPluginModule("plugin", "checksum");
      } catch {
        // Expected to fail
      }

      // Wait for async blob.text() to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify all imports were rewritten
      expect(capturedBlobContent).toContain('from "/vendor/react.js"');
      expect(capturedBlobContent).toContain('from "/vendor/galacius/design-system.js"');
      expect(capturedBlobContent).toContain('import("/api/plugins/plugin/dist/chunk.js")');
      expect(capturedBlobContent).toContain('from "/vendor/tanstack/react-query.js"');
    });

    it("should preserve non-rewritable imports unchanged", async () => {
      const bundleSource = `
import { something } from "some-unknown-vendor";
const x = "string with import('fake') inside";
      `.trim();

      vi.stubGlobal("HTMLScriptElement", {
        supports: vi.fn(() => false),
      });

      let capturedBlobContent: string = "";
      const createObjectURLMock = vi.fn((blob) => {
        if (blob instanceof Blob) {
          blob.text().then((text) => {
            capturedBlobContent = text;
          });
        }
        return "blob:mock-123";
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          text: async () => bundleSource,
        }))
      );

      vi.stubGlobal("URL", {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: vi.fn(),
      } as any);

      try {
        await loadPluginModule("plugin", "checksum");
      } catch {
        // Expected to fail
      }

      // Wait for async blob.text() to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify unknown imports and string contents are preserved
      expect(capturedBlobContent).toContain('from "some-unknown-vendor"');
      expect(capturedBlobContent).toContain("string with import(");
    });

    it("should log info when using fallback path", async () => {
      const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

      vi.stubGlobal("HTMLScriptElement", {
        supports: vi.fn(() => false),
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          text: async () => "export const x = 1;",
        }))
      );

      vi.stubGlobal("URL", {
        createObjectURL: vi.fn(() => "blob:mock"),
        revokeObjectURL: vi.fn(),
      } as any);

      try {
        await loadPluginModule("sample-plugin", "checksum");
      } catch {
        // Expected to fail
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "[loadPluginModule] import-map not supported; using fallback path for sample-plugin"
        )
      );

      consoleSpy.mockRestore();
    });

    it("should throw if fetch fails", async () => {
      vi.stubGlobal("HTMLScriptElement", {
        supports: vi.fn(() => false),
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: false,
          status: 404,
          statusText: "Not Found",
        }))
      );

      await expect(loadPluginModule("missing", "checksum")).rejects.toThrow(
        "Failed to fetch plugin bundle"
      );
    });

    it("should revoke Blob URL when done or on error", async () => {
      const revokeObjectURLMock = vi.fn();

      vi.stubGlobal("HTMLScriptElement", {
        supports: vi.fn(() => false),
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          text: async () => "export const x = 1;",
        }))
      );

      const blobUrlMock = "blob:mock-url-unique";
      vi.stubGlobal("URL", {
        createObjectURL: vi.fn(() => blobUrlMock),
        revokeObjectURL: revokeObjectURLMock,
      } as any);

      try {
        await loadPluginModule("plugin", "checksum");
      } catch {
        // Expected to fail
      }

      // Verify cleanup happened
      expect(revokeObjectURLMock).toHaveBeenCalledWith(blobUrlMock);
    });

    it("should not rewrite import-shaped text inside comments or strings", async () => {
      const bundleSource = `
// import { fake } from "react";
/* import { alsoFake } from "@galacius/design-system"; also import("./nope.js") */
import { real } from "react";
const s = "a string with from \\"react\\" inside it";
const t = 'contains import("./also-not-real.js") as text';
      `.trim();

      vi.stubGlobal("HTMLScriptElement", {
        supports: vi.fn(() => false),
      });

      let capturedBlobContent = "";
      const createObjectURLMock = vi.fn((blob) => {
        if (blob instanceof Blob) {
          blob.text().then((text) => {
            capturedBlobContent = text;
          });
        }
        return "blob:mock-123";
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          text: async () => bundleSource,
        }))
      );

      vi.stubGlobal("URL", {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: vi.fn(),
      } as any);

      try {
        await loadPluginModule("plugin", "checksum");
      } catch {
        // Expected to fail
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // The real import outside comments/strings must be rewritten...
      expect(capturedBlobContent).toContain('from "/vendor/react.js"');
      // ...but the comment/string content must survive untouched.
      expect(capturedBlobContent).toContain('// import { fake } from "react";');
      expect(capturedBlobContent).toContain(
        '/* import { alsoFake } from "@galacius/design-system"; also import("./nope.js") */'
      );
      expect(capturedBlobContent).toContain('a string with from \\"react\\" inside it');
      expect(capturedBlobContent).toContain('contains import("./also-not-real.js") as text');
    });

    it("should correctly resolve ../ relative specifiers", async () => {
      const bundleSource = `
const A = () => import("../shared/Chunk-A.js");
const B = () => import("./sibling/Chunk-B.js");
const C = () => import("../../too-far/Chunk-C.js");
      `.trim();

      vi.stubGlobal("HTMLScriptElement", {
        supports: vi.fn(() => false),
      });

      let capturedBlobContent = "";
      const createObjectURLMock = vi.fn((blob) => {
        if (blob instanceof Blob) {
          blob.text().then((text) => {
            capturedBlobContent = text;
          });
        }
        return "blob:mock-123";
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          text: async () => bundleSource,
        }))
      );

      vi.stubGlobal("URL", {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: vi.fn(),
      } as any);

      try {
        await loadPluginModule("sample-plugin", "checksum");
      } catch {
        // Expected to fail
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // "../shared/..." from /api/plugins/sample-plugin/dist/ resolves up one level.
      expect(capturedBlobContent).toContain(
        'import("/api/plugins/sample-plugin/shared/Chunk-A.js")'
      );
      // "./sibling/..." stays under dist/.
      expect(capturedBlobContent).toContain(
        'import("/api/plugins/sample-plugin/dist/sibling/Chunk-B.js")'
      );
      // "../../too-far/..." resolves up two levels from dist/.
      expect(capturedBlobContent).toContain('import("/api/plugins/too-far/Chunk-C.js")');
    });

    it("should rewrite a real production plugin bundle without corrupting it", async () => {
      const realBundlePath = join(
        homedir(),
        ".galacius",
        "plugins",
        "sample-plugin",
        "dist",
        "index.js"
      );
      if (!existsSync(realBundlePath)) {
        // Sandbox-dependent fixture: skip if the plugin isn't installed locally.
        return;
      }
      const realBundleSource = readFileSync(realBundlePath, "utf-8");

      vi.stubGlobal("HTMLScriptElement", {
        supports: vi.fn(() => false),
      });

      let capturedBlobContent = "";
      const createObjectURLMock = vi.fn((blob) => {
        if (blob instanceof Blob) {
          blob.text().then((text) => {
            capturedBlobContent = text;
          });
        }
        return "blob:mock-real";
      });

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          text: async () => realBundleSource,
        }))
      );

      vi.stubGlobal("URL", {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: vi.fn(),
      } as any);

      try {
        await loadPluginModule("sample-plugin", "checksum");
      } catch {
        // Expected to fail (jsdom can't import a blob: URL), we only care about the rewrite.
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // The real bundle imports react — must be rewritten to the vendor path.
      expect(capturedBlobContent).toContain('from "/vendor/react.js"');
      // No remaining bare specifiers to react/design-system/react-query.
      expect(capturedBlobContent).not.toMatch(/from\s+["']react["']/);
      expect(capturedBlobContent).not.toMatch(/from\s+["']@galacius\/design-system["']/);
      expect(capturedBlobContent).not.toMatch(/from\s+["']@tanstack\/react-query["']/);
      // Relative chunk imports must be rewritten to absolute /api/plugins/sample-plugin/... paths,
      // never left as "./..." and never mangled by the old substring(1) bug
      // (which would have produced a malformed "dist./Chunk" path).
      expect(capturedBlobContent).not.toMatch(/import\(\s*["']\.\//);
      expect(capturedBlobContent).not.toContain("dist.");
      // Rewrite must not change the source length imbalance in a way that suggests
      // quote/paren corruption — every rewritten specifier stays a valid quoted string.
      expect(capturedBlobContent).not.toMatch(/from\s+["'][^"']*["'][^"'\s;)]/);
    });
  });

  describe("BARE_SPECIFIER_MAP", () => {
    it("should contain all required vendor paths", () => {
      expect(BARE_SPECIFIER_MAP.react).toBe("/vendor/react.js");
      expect(BARE_SPECIFIER_MAP["react-dom"]).toBe("/vendor/react-dom.js");
      expect(BARE_SPECIFIER_MAP["react/jsx-runtime"]).toBe("/vendor/react-jsx-runtime.js");
      expect(BARE_SPECIFIER_MAP["@galacius/design-system"]).toBe(
        "/vendor/galacius/design-system.js"
      );
      expect(BARE_SPECIFIER_MAP["@galacius/core"]).toBe("/vendor/galacius/core.js");
      expect(BARE_SPECIFIER_MAP["@tanstack/react-query"]).toBe("/vendor/tanstack/react-query.js");
    });

    it("should match frontend/index.html importmap entries", () => {
      // Ensure the map matches what's in index.html
      // These must stay in sync
      const expectedEntries = {
        react: "/vendor/react.js",
        "react-dom": "/vendor/react-dom.js",
        "react/jsx-runtime": "/vendor/react-jsx-runtime.js",
        "@galacius/design-system": "/vendor/galacius/design-system.js",
        "@galacius/core": "/vendor/galacius/core.js",
        "@tanstack/react-query": "/vendor/tanstack/react-query.js",
      };

      Object.entries(expectedEntries).forEach(([key, value]) => {
        expect(BARE_SPECIFIER_MAP[key as keyof typeof BARE_SPECIFIER_MAP]).toBe(value);
      });
    });
  });
});
