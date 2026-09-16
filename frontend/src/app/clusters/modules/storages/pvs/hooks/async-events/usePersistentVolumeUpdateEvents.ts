import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { PersistentVolumeDetail } from "../../api/resources";
import { UnwatchPersistentVolumeDetail, WatchPersistentVolumeDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific (cluster-scoped)
// PersistentVolume as "watched" with the backend (see
// App.WatchPersistentVolumeDetail), then listens for "pv:update" (singular
// — distinct from the "pvs:update" list topic) pushes carrying a full
// PersistentVolumeDetail. Only the watched PV is ever pushed on this topic.
// Used by useGetPersistentVolumeByName to merge live updates locally
// without invalidate/refetch.
export function usePersistentVolumeUpdateEvents(name: string): PersistentVolumeDetail | undefined {
  const [latestPV, setLatestPV] = useState<PersistentVolumeDetail | undefined>(undefined);

  useEffect(() => {
    if (!name) {
      return;
    }

    WatchPersistentVolumeDetail(name);

    const cancel = EventsOn("pv:update", (data: PersistentVolumeDetail) => {
      if (data.Name === name) {
        startTransition(() => {
          setLatestPV(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchPersistentVolumeDetail(name);
    };
  }, [name]);

  // Discard any value pushed for a previous name rather than resetting
  // state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestPV && latestPV.Name === name) {
      return latestPV;
    }
    return undefined;
  }, [latestPV, name]);
}
