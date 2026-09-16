import type { SharedUnifiedTrayContext, UnifiedTrayAllFamily } from "@galacius/core";
import { createContext, FC, ReactNode, useCallback, useContext, useMemo, useReducer } from "react";
import type { UnifiedTrayTab } from "./UnifiedTrayTypes";

export interface UnifiedTrayContextValue extends SharedUnifiedTrayContext {
  tabs: UnifiedTrayTab[];
  activeTabId: string | null;
  collapsed: boolean;
  expanded: boolean;
  snapPoint: "36px" | 400 | 1;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => void;
  closeAll: () => void;
  setSnapPoint: (point: "36px" | 400 | 1) => void;
}

const UnifiedTrayContext = createContext<UnifiedTrayContextValue | undefined>(undefined);

interface TrayState {
  tabs: UnifiedTrayTab[];
  activeTabId: string | null;
  collapsed: boolean;
  expanded: boolean;
  snapPoint: "36px" | 400 | 1;
}

type TrayAction =
  | { type: "open_tab"; tab: UnifiedTrayTab }
  | { type: "set_active"; id: string }
  | { type: "close_tab"; id: string }
  | { type: "close_all" }
  | { type: "set_snap_point"; snapPoint: "36px" | 400 | 1 };

function matchesModificationTab(
  tab: UnifiedTrayTab,
  kind: string,
  name: string,
  namespace?: string
): boolean {
  if (tab.origin !== "core" || tab.family !== "modification") return false;
  return tab.kind === kind && tab.name === name && tab.namespace === namespace;
}

function matchesPodTab(
  tab: UnifiedTrayTab,
  contextName: string,
  ns: string,
  pod: string,
  mode: "logs" | "exec"
): boolean {
  if (tab.origin !== "core" || tab.family !== "pod") return false;
  return tab.contextName === contextName && tab.ns === ns && tab.pod === pod && tab.mode === mode;
}

function trayReducer(state: TrayState, action: TrayAction): TrayState {
  switch (action.type) {
    case "open_tab": {
      // Dedup logic — check if this tab already exists based on family identity
      const existing = state.tabs.find((t) => {
        if (action.tab.origin === "core" && action.tab.family === "modification") {
          return matchesModificationTab(t, action.tab.kind, action.tab.name, action.tab.namespace);
        }
        if (action.tab.origin === "core" && action.tab.family === "pod") {
          return matchesPodTab(
            t,
            action.tab.contextName,
            action.tab.ns,
            action.tab.pod,
            action.tab.mode
          );
        }
        if (action.tab.origin === "plugin") {
          // Generic plugin-owned family — identity is the deterministic id
          // built from family + dedupeKey in openTab below.
          return t.id === action.tab.id;
        }
        return false;
      });

      if (existing) {
        return { ...state, activeTabId: existing.id };
      }

      return {
        ...state,
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
        // When opening a tab, default snap point to 400px (default height)
        snapPoint: state.snapPoint === "36px" ? 400 : state.snapPoint,
      };
    }
    case "set_active":
      return { ...state, activeTabId: action.id };
    case "close_tab": {
      const idx = state.tabs.findIndex((t) => t.id === action.id);
      const tabs = state.tabs.filter((t) => t.id !== action.id);
      if (state.activeTabId !== action.id) {
        return { ...state, tabs };
      }
      const fallback = state.tabs[idx + 1] ?? state.tabs[idx - 1];
      return { ...state, tabs, activeTabId: fallback?.id ?? null };
    }
    case "close_all":
      return { ...state, tabs: [], activeTabId: null };
    case "set_snap_point":
      return { ...state, snapPoint: action.snapPoint };
  }
}

export const UnifiedTrayProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [{ tabs, activeTabId, collapsed, expanded, snapPoint }, dispatch] = useReducer(
    trayReducer,
    {
      tabs: [],
      activeTabId: null,
      collapsed: false,
      expanded: false,
      snapPoint: "36px" as const,
    }
  );

  const openTab = useCallback(
    (
      family: UnifiedTrayAllFamily,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: any
    ) => {
      let newTab: UnifiedTrayTab;
      if (family === "modification") {
        newTab = {
          origin: "core",
          family: "modification",
          id: `${params.kind}-${params.namespace ?? ""}-${params.name}-${Date.now()}`,
          kind: params.kind,
          name: params.name,
          namespace: params.namespace,
        };
      } else if (family === "pod") {
        newTab = {
          origin: "core",
          family: "pod",
          id: `${params.contextName}/${params.ns}/${params.pod}/${params.mode}/${Date.now()}`,
          contextName: params.contextName,
          ns: params.ns,
          pod: params.pod,
          containers: params.containers,
          mode: params.mode,
          ownerKind: params.ownerKind,
          ownerName: params.ownerName,
        };
      } else {
        // Generic plugin-owned family — host has no static knowledge of its
        // shape. `label`/`icon`/`dedupeKey` drive the tab bar and identity;
        // everything else is opaque domain data for the plugin's own
        // content component to read back out of `params`.
        const { label, icon, dedupeKey, pluginId, ...rest } = params;
        newTab = {
          origin: "plugin",
          family,
          id: `${family}:${dedupeKey}`,
          label,
          icon,
          pluginId,
          params: rest,
        };
      }
      dispatch({ type: "open_tab", tab: newTab });
    },
    []
  );

  const setActiveTab = useCallback((id: string) => dispatch({ type: "set_active", id }), []);
  const closeTab = useCallback((id: string) => dispatch({ type: "close_tab", id }), []);
  const closeAll = useCallback(() => dispatch({ type: "close_all" }), []);
  const setSnapPoint = useCallback((point: string | number | null) => {
    // Only dispatch if a valid snap point (ignore null)
    if (point === "36px" || point === 400 || point === 1) {
      dispatch({ type: "set_snap_point", snapPoint: point });
    }
  }, []);

  const value = useMemo(
    () => ({
      tabs,
      activeTabId,
      collapsed,
      expanded,
      snapPoint,
      openTab,
      setActiveTab,
      closeTab,
      closeAll,
      setSnapPoint,
    }),
    [
      tabs,
      activeTabId,
      collapsed,
      expanded,
      snapPoint,
      openTab,
      setActiveTab,
      closeTab,
      closeAll,
      setSnapPoint,
    ]
  );

  return <UnifiedTrayContext.Provider value={value}>{children}</UnifiedTrayContext.Provider>;
};

export function useUnifiedTray(): UnifiedTrayContextValue {
  const ctx = useContext(UnifiedTrayContext);
  if (!ctx) {
    throw new Error("useUnifiedTray must be used within a UnifiedTrayProvider");
  }
  return ctx;
}
