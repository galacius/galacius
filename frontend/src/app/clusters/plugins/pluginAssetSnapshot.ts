import type { NavEntry, SharedUnifiedTrayContentProps } from "@galacius/core";
import type { ComponentType } from "react";
import { pluginEventRegistry } from "./hooks/registry/event/pluginEventRegistry";
import { pluginNavRegistry } from "./hooks/registry/nav/pluginNavRegistry";
import { pluginTrayRegistry } from "./hooks/registry/tray/pluginTrayRegistry";
import { pluginViewRegistry } from "./hooks/registry/view/pluginViewRegistry";

interface PluginAssetSnapshot {
  bundleChecksum: string;
  navEntry?: NavEntry<string>;
  viewConfigs: Array<{
    name: string;
    component: ComponentType;
    stylesheet?: Promise<{ default: string }>;
  }>;
  trayFamilies?: Record<string, ComponentType<SharedUnifiedTrayContentProps>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventHandlers: Record<string, (payload: any) => void>;
}

const snapshots = new Map<string, PluginAssetSnapshot>();

/**
 * Captures whatever a plugin bundle's module-eval-time registration calls
 * (registerNavEntry/registerViews/registerTrayFamilies/registerEvents) just
 * populated into the registries, keyed by pluginId + bundleChecksum. Call
 * right after a fresh `import()` of a plugin bundle succeeds.
 */
export function capturePluginAssetSnapshot(pluginId: string, bundleChecksum: string): void {
  const navEntry = pluginNavRegistry.getNavEntries().find((e) => e.pluginId === pluginId)?.navEntry;
  const viewConfigs: PluginAssetSnapshot["viewConfigs"] = [];
  for (const a of pluginViewRegistry.getViewAssets())
    if (a.pluginId === pluginId)
      viewConfigs.push({
        name: a.name,
        component: a.component,
        stylesheet: a.stylesheet,
      });

  const trayFamilies = pluginTrayRegistry
    .getTrayFamilies()
    .find((t) => t.pluginId === pluginId)?.families;
  const eventHandlers = pluginEventRegistry.getHandlersForPlugin(pluginId);

  snapshots.set(pluginId, {
    bundleChecksum,
    navEntry,
    viewConfigs,
    trayFamilies,
    eventHandlers,
  });
}

/**
 * Re-populates the registries from a previously captured snapshot, without
 * re-importing the plugin bundle. Needed because the browser's ES module
 * loader caches an evaluated module by URL for the page's lifetime —
 * re-importing the same URL (same pluginId + bundleChecksum, e.g. after a
 * disable/re-enable cycle unmounts then remounts PluginResourceView)
 * resolves instantly from cache WITHOUT re-running the module's top-level
 * registration calls, which would otherwise leave the plugin's nav entry,
 * views, etc. missing until a full page reload resets the module cache.
 * Returns true if a matching snapshot was restored.
 */
export function restorePluginAssetSnapshot(pluginId: string, bundleChecksum: string): boolean {
  const snapshot = snapshots.get(pluginId);
  if (!snapshot || snapshot.bundleChecksum !== bundleChecksum) return false;

  if (snapshot.navEntry) pluginNavRegistry.registerNavEntry(pluginId, snapshot.navEntry);
  if (snapshot.viewConfigs.length > 0)
    pluginViewRegistry.registerViews(pluginId, snapshot.viewConfigs);
  if (snapshot.trayFamilies)
    pluginTrayRegistry.registerTrayFamilies(pluginId, snapshot.trayFamilies);
  if (Object.keys(snapshot.eventHandlers).length > 0)
    pluginEventRegistry.registerEvents(pluginId, snapshot.eventHandlers);

  return true;
}
