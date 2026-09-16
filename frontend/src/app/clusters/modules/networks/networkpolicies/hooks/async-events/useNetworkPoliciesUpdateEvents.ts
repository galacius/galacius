import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useState, startTransition } from "react";
import type { NetworkPolicy } from "../../api/resources";

// Data-only event hook: tracks the latest pushed data in local state.
// The backend pre-filters "networkpolicies:update" by the currently active namespace
// selection (see App.SetActiveNamespaces / emitNetworkPolicies), so this hook
// no longer needs to know about namespaces at all.
export function useNetworkPoliciesUpdateEvents(): NetworkPolicy[] {
  const [latestNetworkPolicies, setLatestNetworkPolicies] = useState<NetworkPolicy[]>([]);

  useEffect(() => {
    return EventsOn("networkpolicies:update", (data: NetworkPolicy[]) => {
      startTransition(() => {
        setLatestNetworkPolicies(data);
      });
    });
  }, []);

  return latestNetworkPolicies;
}
