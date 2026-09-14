import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { PersistentVolumeClaimDetail } from "../../api/resources";
import {
  UnwatchPersistentVolumeClaimDetail,
  WatchPersistentVolumeClaimDetail,
} from "../../api/resources";

// Scoped detail event hook: registers this specific PersistentVolumeClaim
// (namespace/name) as "watched" with the backend (see
// App.WatchPersistentVolumeClaimDetail), then listens for "pvc:update"
// (singular — distinct from the "pvcs:update" list topic) pushes carrying a
// full PersistentVolumeClaimDetail. Only watched PVCs are ever pushed on
// this topic. Used by useGetPersistentVolumeClaimDetail to merge live
// updates locally without invalidate/refetch.
export function usePersistentVolumeClaimUpdateEvents(
  namespace: string,
  name: string
): PersistentVolumeClaimDetail | undefined {
  const [latestPVC, setLatestPVC] = useState<PersistentVolumeClaimDetail | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchPersistentVolumeClaimDetail(namespace, name);

    const cancel = EventsOn("pvc:update", (data: PersistentVolumeClaimDetail) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestPVC(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchPersistentVolumeClaimDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any value pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestPVC && latestPVC.Namespace === namespace && latestPVC.Name === name) {
      return latestPVC;
    }
    return undefined;
  }, [latestPVC, namespace, name]);
}
