import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { Pod } from "../../api/resources";
import { UnwatchPodDetail, WatchPodDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific Pod (namespace/name) as
// "watched" with the backend (see App.WatchPodDetail), then listens for
// "pod:update" (singular — distinct from the "pods:update" list topic)
// pushes carrying a detail=true dto.Pod (including ManagedFields). The list
// topic only ever carries the lean detail=false shape, so merging it
// directly into a detail hook would silently wipe out detail-only fields on
// every list push. Used by useGetPodDetail to merge live updates locally
// without invalidate/refetch.
export function usePodDetailUpdateEvents(namespace: string, name: string): Pod | undefined {
  const [latestPod, setLatestPod] = useState<Pod | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchPodDetail(namespace, name);

    const cancel = EventsOn("pod:update", (data: Pod) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestPod(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchPodDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any pod pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestPod && latestPod.Namespace === namespace && latestPod.Name === name) {
      return latestPod;
    }
    return undefined;
  }, [latestPod, namespace, name]);
}
