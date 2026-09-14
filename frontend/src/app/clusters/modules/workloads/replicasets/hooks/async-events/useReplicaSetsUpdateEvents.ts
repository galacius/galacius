import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { ReplicaSet } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "replicasets:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitReplicaSets), so this hook
// no longer needs to know about namespaces at all.
export function useReplicaSetsUpdateEvents(): ReplicaSet[] {
  const [latestReplicaSets, setLatestReplicaSets] = useState<ReplicaSet[]>([]);

  useEffect(() => {
    return EventsOn("replicasets:update", (data: ReplicaSet[]) => {
      startTransition(() => {
        setLatestReplicaSets(data);
      });
    });
  }, []);

  return latestReplicaSets;
}
