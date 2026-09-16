import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { ReplicaSet } from "../../api/resources";
import { UnwatchReplicaSetDetail, WatchReplicaSetDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific ReplicaSet (namespace/name) as
// "watched" with the backend (see App.WatchReplicaSetDetail), then listens for
// "replicaset:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetReplicaSetDetail to merge live updates
// locally without invalidate/refetch.
export function useReplicaSetDetailUpdateEvents(
  namespace: string,
  name: string
): ReplicaSet | undefined {
  const [latestReplicaSet, setLatestReplicaSet] = useState<ReplicaSet | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchReplicaSetDetail(namespace, name);

    const cancel = EventsOn("replicaset:update", (data: ReplicaSet) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestReplicaSet(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchReplicaSetDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any ReplicaSet pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (
      latestReplicaSet &&
      latestReplicaSet.Namespace === namespace &&
      latestReplicaSet.Name === name
    ) {
      return latestReplicaSet;
    }
    return undefined;
  }, [latestReplicaSet, namespace, name]);
}
