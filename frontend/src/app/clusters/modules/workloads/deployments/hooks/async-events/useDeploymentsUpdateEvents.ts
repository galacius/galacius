import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { Deployment } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "deployments:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitDeployments), so this hook
// no longer needs to know about namespaces at all.
export function useDeploymentsUpdateEvents(): Deployment[] {
  const [latestDeployments, setLatestDeployments] = useState<Deployment[]>([]);

  useEffect(() => {
    return EventsOn("deployments:update", (data: Deployment[]) => {
      startTransition(() => {
        setLatestDeployments(data);
      });
    });
  }, []);

  return latestDeployments;
}
