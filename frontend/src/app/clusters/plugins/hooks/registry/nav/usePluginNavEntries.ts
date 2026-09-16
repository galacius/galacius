import type { NavEntry } from "@galacius/core";
import { useMemo, useSyncExternalStore } from "react";
import { pluginNavRegistry } from "./pluginNavRegistry";

interface PluginNavData {
  navEntries: NavEntry<string>[];
  viewTypeToPluginId: Record<string, string>;
  resourceLabels: Record<string, string>;
}

/**
 * Reactive read side of pluginNavRegistry — rebuilds the merged nav data
 * (mirroring the shape useGetInstalledPluginNav used to derive from dynamic
 * imports) whenever a plugin registers via clusterWideAPI.registerNavEntry()
 * or the host unregisters it on uninstall (see MainLayout).
 */
export function usePluginNavEntries(): PluginNavData {
  const subscribe = useMemo(
    () => pluginNavRegistry.subscribeNavRegistry.bind(pluginNavRegistry),
    []
  );
  const getSnapshot = useMemo(() => pluginNavRegistry.getNavEntries.bind(pluginNavRegistry), []);
  const registered = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo<PluginNavData>(() => {
    const navEntries: NavEntry<string>[] = [];
    const viewTypeToPluginId: Record<string, string> = {};
    const resourceLabels: Record<string, string> = {};

    for (const { pluginId, navEntry } of registered) {
      navEntries.push(navEntry);

      if (navEntry.kind === "group") {
        for (const item of navEntry.group.items) {
          if (item.view) {
            viewTypeToPluginId[item.view] = pluginId;
            resourceLabels[item.view] = item.label;
          }
        }
      } else if (navEntry.kind === "item" && navEntry.item.view) {
        const view = navEntry.item.view;
        viewTypeToPluginId[view] = pluginId;
        resourceLabels[view] = navEntry.item.label;
      }
    }

    return { navEntries, viewTypeToPluginId, resourceLabels };
  }, [registered]);
}
