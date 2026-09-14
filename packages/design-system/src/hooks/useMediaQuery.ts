import { useSyncExternalStore } from "react";

const subscribe = (query: string) => (onStoreChange: () => void) => {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
};

export const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => false
  );

/** Tailwind's default breakpoint scale (min-width, in px). */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

export const useBreakpoint = (breakpoint: Breakpoint) =>
  useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]}px)`);
