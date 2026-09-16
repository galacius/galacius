import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { StatefulSet } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "statefulsets:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitStatefulSets), so this hook
// no longer needs to know about namespaces at all.
export function useStatefulSetsUpdateEvents(): StatefulSet[] {
  const [latestStatefulSets, setLatestStatefulSets] = useState<StatefulSet[]>([]);

  useEffect(() => {
    return EventsOn("statefulsets:update", (data: StatefulSet[]) => {
      startTransition(() => {
        setLatestStatefulSets(data);
      });
    });
  }, []);

  return latestStatefulSets;
}
