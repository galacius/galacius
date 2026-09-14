import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { ResourceQuota } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "resourcequotas:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitResourceQuotas), so this hook
// no longer needs to know about namespaces at all.
export function useResourceQuotasUpdateEvents(): ResourceQuota[] {
  const [latestResourceQuotas, setLatestResourceQuotas] = useState<ResourceQuota[]>([]);

  useEffect(() => {
    return EventsOn("resourcequotas:update", (data: ResourceQuota[]) => {
      startTransition(() => {
        setLatestResourceQuotas(data);
      });
    });
  }, []);

  return latestResourceQuotas;
}
