import { startTransition, useEffect, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import type { PersistentVolume } from "../../api/resources";

// Data-only event hook: tracks the latest pushed persistent volumes in local state.
// Called directly from persistent volume data-access hooks (useGetPersistentVolumes, useGetPersistentVolumeByName, useGetPersistentVolumeYAML)
// to merge event-driven data locally without cache-wide side effects.
export function usePersistentVolumesUpdateEvents(): PersistentVolume[] {
  const [latestPersistentVolumes, setLatestPersistentVolumes] = useState<PersistentVolume[]>([]);
  useEffect(() => {
    return EventsOn("pvs:update", (data: PersistentVolume[]) => {
      startTransition(() => {
        setLatestPersistentVolumes(data);
      });
    });
  }, []);
  return latestPersistentVolumes;
}
