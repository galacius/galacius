import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { Endpoint } from "../../api/resources";
import { UnwatchEndpointDetail, WatchEndpointDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific Endpoint (namespace/name) as
// "watched" with the backend (see App.WatchEndpointDetail), then listens for
// "endpoint:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetEndpointDetail to merge live updates
// locally without invalidate/refetch.
export function useEndpointDetailUpdateEvents(
  namespace: string,
  name: string
): Endpoint | undefined {
  const [latestEndpoint, setLatestEndpoint] = useState<Endpoint | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchEndpointDetail(namespace, name);

    const cancel = EventsOn("endpoint:update", (data: Endpoint) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestEndpoint(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchEndpointDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any Endpoint pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestEndpoint && latestEndpoint.Namespace === namespace && latestEndpoint.Name === name) {
      return latestEndpoint;
    }
    return undefined;
  }, [latestEndpoint, namespace, name]);
}
