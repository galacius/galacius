import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { PersistentVolumeClaim } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "persistentvolumeclaims:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitPVCs), so this hook
// no longer needs to know about namespaces at all.
export function usePersistentVolumeClaimsUpdateEvents(): PersistentVolumeClaim[] {
  const [latestPVCs, setLatestPVCs] = useState<PersistentVolumeClaim[]>([]);

  useEffect(() => {
    return EventsOn("persistentvolumeclaims:update", (data: PersistentVolumeClaim[]) => {
      startTransition(() => {
        setLatestPVCs(data);
      });
    });
  }, []);

  return latestPVCs;
}
