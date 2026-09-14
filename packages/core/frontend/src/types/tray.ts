import type { ReactNode } from "react";

// Shared contract for the unified tray, consumed across the main app and
// plugin frontends. Plugin bundles build standalone and
// cannot import from the main app's `@/app` module tree, so this lives here
// instead. Keep this to the minimal shape actually consumed across the
// boundary — the main app's `UnifiedTrayContextValue` is a structural
// superset and extends this type directly.

// Tray families owned by the main app's built-in resource views. Plugins own
// their own families identified by an arbitrary string — the host never
// needs to know their names or shapes ahead of time.
export type UnifiedTrayCoreFamily = "modification" | "pod";

export type UnifiedTrayAllFamily = UnifiedTrayCoreFamily | (string & {});

// Generic params a plugin passes to `openTab` for its own (non-core) family.
// `label`/`icon` drive the tab bar; `dedupeKey` identifies "the same tab" for
// re-opening (e.g. re-clicking install on the same chart focuses the
// existing tab instead of opening a duplicate); everything else is opaque
// domain data the plugin's own tray content component reads back out.
export interface SharedUnifiedTrayOpenParams {
  label: string;
  icon?: ReactNode;
  dedupeKey: string;
  [key: string]: unknown;
}

// Generic tab shape for a plugin-owned family, as seen by the plugin's own
// tray content component (via `SharedUnifiedTrayContentProps`).
export interface SharedUnifiedTrayTab {
  family: string;
  id: string;
  label: string;
  icon?: ReactNode;
  params: Record<string, unknown>;
}

export interface SharedUnifiedTrayContentProps {
  tab: SharedUnifiedTrayTab;
  collapsed: boolean;
  onClose: () => void;
}

export interface SharedUnifiedTrayContext {
  openTab: (
    family: UnifiedTrayAllFamily,
    // Core families ("modification"/"pod") are typed narrowly by the host's
    // own `UnifiedTrayContextValue`; plugin-owned families should pass
    // `SharedUnifiedTrayOpenParams`. Left as `any` here so the host's
    // stricter per-family overloads for its own families remain assignable.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: any
  ) => void;
}
