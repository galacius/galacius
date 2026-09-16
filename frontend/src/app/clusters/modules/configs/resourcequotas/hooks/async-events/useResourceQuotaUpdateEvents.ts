import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { ResourceQuotaDetail } from "../../api/resources";
import { UnwatchResourceQuotaDetail, WatchResourceQuotaDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific ResourceQuota
// (namespace/name) as "watched" with the backend (see
// App.WatchResourceQuotaDetail), then listens for "resourcequota:update"
// (singular — distinct from the "resourcequotas:update" list topic) pushes
// carrying a full ResourceQuotaDetail. Only watched ResourceQuotas are ever
// pushed on this topic. Used by useGetResourceQuotaDetail to merge live
// updates locally without invalidate/refetch.
export function useResourceQuotaUpdateEvents(
  namespace: string,
  name: string
): ResourceQuotaDetail | undefined {
  const [latestResourceQuota, setLatestResourceQuota] = useState<ResourceQuotaDetail | undefined>(
    undefined
  );

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchResourceQuotaDetail(namespace, name);

    const cancel = EventsOn("resourcequota:update", (data: ResourceQuotaDetail) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestResourceQuota(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchResourceQuotaDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any value pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (
      latestResourceQuota &&
      latestResourceQuota.Namespace === namespace &&
      latestResourceQuota.Name === name
    ) {
      return latestResourceQuota;
    }
    return undefined;
  }, [latestResourceQuota, namespace, name]);
}
