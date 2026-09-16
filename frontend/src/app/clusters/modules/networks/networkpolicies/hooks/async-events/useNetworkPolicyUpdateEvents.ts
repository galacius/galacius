import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { NetworkPolicyDetail } from "../../api/resources";
import { UnwatchNetworkPolicyDetail, WatchNetworkPolicyDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific NetworkPolicy
// (namespace/name) as "watched" with the backend (see
// App.WatchNetworkPolicyDetail), then listens for "networkpolicy:update"
// (singular — distinct from the "networkpolicies:update" list topic)
// pushes carrying a full NetworkPolicyDetail. Only watched NetworkPolicies
// are ever pushed on this topic. Used by useGetNetworkPolicyDetail to merge
// live updates locally without invalidate/refetch.
export function useNetworkPolicyUpdateEvents(
  namespace: string,
  name: string
): NetworkPolicyDetail | undefined {
  const [latestNetworkPolicy, setLatestNetworkPolicy] = useState<NetworkPolicyDetail | undefined>(
    undefined
  );

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchNetworkPolicyDetail(namespace, name);

    const cancel = EventsOn("networkpolicy:update", (data: NetworkPolicyDetail) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestNetworkPolicy(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchNetworkPolicyDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any value pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (
      latestNetworkPolicy &&
      latestNetworkPolicy.Namespace === namespace &&
      latestNetworkPolicy.Name === name
    ) {
      return latestNetworkPolicy;
    }
    return undefined;
  }, [latestNetworkPolicy, namespace, name]);
}
