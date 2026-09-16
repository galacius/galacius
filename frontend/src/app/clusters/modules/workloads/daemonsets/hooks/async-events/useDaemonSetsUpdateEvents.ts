import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { DaemonSet } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "daemonsets:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitDaemonSets), so this hook
// no longer needs to know about namespaces at all.
export function useDaemonSetsUpdateEvents(): DaemonSet[] {
  const [latestDaemonSets, setLatestDaemonSets] = useState<DaemonSet[]>([]);

  useEffect(() => {
    return EventsOn("daemonsets:update", (data: DaemonSet[]) => {
      startTransition(() => {
        setLatestDaemonSets(data);
      });
    });
  }, []);

  return latestDaemonSets;
}
