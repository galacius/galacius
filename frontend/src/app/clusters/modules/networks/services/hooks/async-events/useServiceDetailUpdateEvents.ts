import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { Service } from "../../api/resources";
import { UnwatchServiceDetail, WatchServiceDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific Service (namespace/name) as
// "watched" with the backend (see App.WatchServiceDetail), then listens for
// "service:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetServiceDetail to merge live updates
// locally without invalidate/refetch.
export function useServiceDetailUpdateEvents(namespace: string, name: string): Service | undefined {
  const [latestService, setLatestService] = useState<Service | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchServiceDetail(namespace, name);

    const cancel = EventsOn("service:update", (data: Service) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestService(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchServiceDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any Service pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestService && latestService.Namespace === namespace && latestService.Name === name) {
      return latestService;
    }
    return undefined;
  }, [latestService, namespace, name]);
}
