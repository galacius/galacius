import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { StatefulSet } from "../../api/resources";
import { UnwatchStatefulSetDetail, WatchStatefulSetDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific StatefulSet (namespace/name) as
// "watched" with the backend (see App.WatchStatefulSetDetail), then listens for
// "statefulset:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetStatefulSetDetail to merge live updates
// locally without invalidate/refetch.
export function useStatefulSetDetailUpdateEvents(
  namespace: string,
  name: string
): StatefulSet | undefined {
  const [latestStatefulSet, setLatestStatefulSet] = useState<StatefulSet | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchStatefulSetDetail(namespace, name);

    const cancel = EventsOn("statefulset:update", (data: StatefulSet) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestStatefulSet(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchStatefulSetDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any StatefulSet pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (
      latestStatefulSet &&
      latestStatefulSet.Namespace === namespace &&
      latestStatefulSet.Name === name
    ) {
      return latestStatefulSet;
    }
    return undefined;
  }, [latestStatefulSet, namespace, name]);
}
