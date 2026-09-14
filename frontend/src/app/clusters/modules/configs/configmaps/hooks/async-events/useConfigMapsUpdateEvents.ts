import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { ConfigMap } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "configmaps:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitConfigMaps), so this hook
// no longer needs to know about namespaces at all.
export function useConfigMapsUpdateEvents(): ConfigMap[] {
  const [latestConfigMaps, setLatestConfigMaps] = useState<ConfigMap[]>([]);

  useEffect(() => {
    return EventsOn("configmaps:update", (data: ConfigMap[]) => {
      startTransition(() => {
        setLatestConfigMaps(data);
      });
    });
  }, []);

  return latestConfigMaps;
}
