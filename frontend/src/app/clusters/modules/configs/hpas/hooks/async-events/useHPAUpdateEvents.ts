import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { HPADetail } from "../../api/resources";
import { UnwatchHPADetail, WatchHPADetail } from "../../api/resources";

// Scoped detail event hook: registers this specific HPA (namespace/name) as
// "watched" with the backend (see App.WatchHPADetail), then listens for
// "hpa:update" (singular — distinct from the "hpas:update" list topic)
// pushes carrying a full HPADetail. Only watched HPAs are ever pushed on
// this topic. Used by useGetHPADetail to merge live updates locally without
// invalidate/refetch.
export function useHPAUpdateEvents(namespace: string, name: string): HPADetail | undefined {
  const [latestHPA, setLatestHPA] = useState<HPADetail | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchHPADetail(namespace, name);

    const cancel = EventsOn("hpa:update", (data: HPADetail) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestHPA(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchHPADetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any value pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestHPA && latestHPA.Namespace === namespace && latestHPA.Name === name) {
      return latestHPA;
    }
    return undefined;
  }, [latestHPA, namespace, name]);
}
