import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver — provide a no-op stub so any component
// that uses it doesn't throw in tests.
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
