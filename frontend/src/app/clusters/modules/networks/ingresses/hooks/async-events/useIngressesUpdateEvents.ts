import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { Ingress } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "ingresses:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitIngresses), so this hook
// no longer needs to know about namespaces at all.
export function useIngressesUpdateEvents(): Ingress[] {
  const [latestIngresses, setLatestIngresses] = useState<Ingress[]>([]);

  useEffect(() => {
    return EventsOn("ingresses:update", (data: Ingress[]) => {
      startTransition(() => {
        setLatestIngresses(data);
      });
    });
  }, []);

  return latestIngresses;
}
