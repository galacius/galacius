import { useMemo, useSyncExternalStore } from "react";
import type { UnifiedTrayContentComponent } from "../../../../shared/components/trays/unified/UnifiedTrayTypes";
import { pluginTrayRegistry } from "./pluginTrayRegistry";

/**
 * Reactive read side of pluginTrayRegistry — merges every registered plugin's
 * tray-family content components into a single family→component map,
 * mirroring usePluginNavEntries. Rebuilds only when a plugin registers or
 * unregisters via registerTrayFamilies/unregisterTrayFamilies.
 */
export function usePluginTrayFamilies(): Record<string, UnifiedTrayContentComponent> {
  const subscribe = useMemo(
    () => pluginTrayRegistry.subscribeTrayRegistry.bind(pluginTrayRegistry),
    []
  );
  const getSnapshot = useMemo(
    () => pluginTrayRegistry.getTrayFamilies.bind(pluginTrayRegistry),
    []
  );
  const registered = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo(
    () =>
      Object.assign({}, ...registered.map((r) => r.families)) as Record<
        string,
        UnifiedTrayContentComponent
      >,
    [registered]
  );
}
