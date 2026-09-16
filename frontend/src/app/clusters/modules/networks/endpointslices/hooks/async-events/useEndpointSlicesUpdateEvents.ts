import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { EndpointSlice } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "endpointslices:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitEndpointSlices), so this hook
// no longer needs to know about namespaces at all.
export function useEndpointSlicesUpdateEvents(): EndpointSlice[] {
  const [latestEndpointSlices, setLatestEndpointSlices] = useState<EndpointSlice[]>([]);

  useEffect(() => {
    return EventsOn("endpointslices:update", (data: EndpointSlice[]) => {
      startTransition(() => {
        setLatestEndpointSlices(data);
      });
    });
  }, []);

  return latestEndpointSlices;
}
