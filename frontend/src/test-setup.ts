import * as DesignSystem from "@galacius/design-system";
import * as ReactQuery from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import * as React from "react";
import * as ReactDom from "react-dom";
import * as ReactJsxRuntime from "react/jsx-runtime";
import { afterEach } from "vitest";

// @testing-library/react only auto-registers its afterEach(cleanup) when it
// detects a global `afterEach` (i.e. test.globals: true). This project runs
// with globals: false, so without this, rendered trees/hooks stay mounted
// across tests — their pending effects/timers can fire after a later test's
// jsdom environment has torn down, surfacing as spurious
// "window is not defined" errors in unrelated test files.
afterEach(() => {
  cleanup();
});

// jsdom does not implement ResizeObserver — provide a no-op stub so any component
// that uses it (TruncatedText, usePodLogs, usePodExec) doesn't throw in tests.
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mirrors the window.__GALACIUS_VENDOR__ global that src/main.tsx sets up at
// app boot for plugin bundles' import-map-resolved bare specifiers (see
// frontend/public/vendor/*.js). Node/jsdom has no browser import-map support,
// so any test that dynamically imports a plugin bundle needs this global
// populated, or "react"/"@galacius/design-system" imports inside that bundle
// will throw.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis.window as any).__GALACIUS_VENDOR__ = {
  react: React,
  reactDom: ReactDom,
  reactJsxRuntime: ReactJsxRuntime,
  designSystem: DesignSystem,
  reactQuery: ReactQuery,
};
