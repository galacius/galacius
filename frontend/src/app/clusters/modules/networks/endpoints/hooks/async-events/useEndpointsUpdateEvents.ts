import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { Endpoint } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "endpoints:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitEndpoints), so this hook
// no longer needs to know about namespaces at all.
export function useEndpointsUpdateEvents(): Endpoint[] {
  const [latestEndpoints, setLatestEndpoints] = useState<Endpoint[]>([]);

  useEffect(() => {
    return EventsOn("endpoints:update", (data: Endpoint[]) => {
      startTransition(() => {
        setLatestEndpoints(data);
      });
    });
  }, []);

  return latestEndpoints;
}
