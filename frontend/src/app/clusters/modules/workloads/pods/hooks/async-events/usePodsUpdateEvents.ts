import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { Pod } from "../../api/resources";

// Data-only event hook: tracks the latest pushed pods in local state.
// Called directly from pod data-access hooks (useGetPods, useGetPodYAML) to
// merge event-driven data locally without cache-wide side effects. Not used
// by useGetPodDetail: the "pods:update" list topic only carries the lean
// detail=false dto.Pod shape, so merging it into a detail hook would
// silently wipe out detail-only fields (e.g. ManagedFields) on every list
// push — see usePodDetailUpdateEvents for the scoped "pod:update" topic used
// there instead.
// The backend pre-filters "pods:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitPodsWithMetrics), so this hook
// no longer needs to know about namespaces at all.
export function usePodsUpdateEvents(): Pod[] {
  const [latestPods, setLatestPods] = useState<Pod[]>([]);

  useEffect(() => {
    return EventsOn("pods:update", (data: Pod[]) => {
      startTransition(() => {
        setLatestPods(data);
      });
    });
  }, []);

  return latestPods;
}
