import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { Lease } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "leases:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitLeases), so this hook
// no longer needs to know about namespaces at all.
export function useLeasesUpdateEvents(): Lease[] {
  const [latestLeases, setLatestLeases] = useState<Lease[]>([]);

  useEffect(() => {
    return EventsOn("leases:update", (data: Lease[]) => {
      startTransition(() => {
        setLatestLeases(data);
      });
    });
  }, []);

  return latestLeases;
}
