import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { DaemonSet } from "../../api/resources";
import { UnwatchDaemonSetDetail, WatchDaemonSetDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific DaemonSet (namespace/name) as
// "watched" with the backend (see App.WatchDaemonSetDetail), then listens for
// "daemonset:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetDaemonSetDetail to merge live updates
// locally without invalidate/refetch.
export function useDaemonSetDetailUpdateEvents(
  namespace: string,
  name: string
): DaemonSet | undefined {
  const [latestDaemonSet, setLatestDaemonSet] = useState<DaemonSet | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchDaemonSetDetail(namespace, name);

    const cancel = EventsOn("daemonset:update", (data: DaemonSet) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestDaemonSet(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchDaemonSetDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any DaemonSet pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (
      latestDaemonSet &&
      latestDaemonSet.Namespace === namespace &&
      latestDaemonSet.Name === name
    ) {
      return latestDaemonSet;
    }
    return undefined;
  }, [latestDaemonSet, namespace, name]);
}
