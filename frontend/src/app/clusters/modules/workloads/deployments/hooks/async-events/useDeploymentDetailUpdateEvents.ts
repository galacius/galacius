import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { Deployment } from "../../api/resources";
import { UnwatchDeploymentDetail, WatchDeploymentDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific Deployment (namespace/name) as
// "watched" with the backend (see App.WatchDeploymentDetail), then listens for
// "deployment:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetDeploymentDetail to merge live updates
// locally without invalidate/refetch.
export function useDeploymentDetailUpdateEvents(
  namespace: string,
  name: string
): Deployment | undefined {
  const [latestDeployment, setLatestDeployment] = useState<Deployment | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchDeploymentDetail(namespace, name);

    const cancel = EventsOn("deployment:update", (data: Deployment) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestDeployment(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchDeploymentDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any Deployment pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (
      latestDeployment &&
      latestDeployment.Namespace === namespace &&
      latestDeployment.Name === name
    ) {
      return latestDeployment;
    }
    return undefined;
  }, [latestDeployment, namespace, name]);
}
