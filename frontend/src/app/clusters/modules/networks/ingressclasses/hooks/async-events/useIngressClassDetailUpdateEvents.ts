import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { IngressClass } from "../../api/resources";
import { UnwatchIngressClassDetail, WatchIngressClassDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific IngressClass (name) as "watched"
// with the backend (see App.WatchIngressClassDetail), then listens for "ingressclass:update"
// (singular — distinct from the plural list topic) pushes carrying the full
// detail payload. Used by useGetIngressClassDetail to merge live updates locally
// without invalidate/refetch.
export function useIngressClassDetailUpdateEvents(name: string): IngressClass | undefined {
  const [latestIngressClass, setLatestIngressClass] = useState<IngressClass | undefined>(undefined);

  useEffect(() => {
    if (!name) {
      return;
    }

    WatchIngressClassDetail(name);

    const cancel = EventsOn("ingressclass:update", (data: IngressClass) => {
      if (data.Name === name) {
        startTransition(() => {
          setLatestIngressClass(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchIngressClassDetail(name);
    };
  }, [name]);

  // Discard any IngressClass pushed for a previous name rather than resetting state
  // synchronously in the effect above (which would trigger a cascading render).
  return useMemo(() => {
    if (latestIngressClass && latestIngressClass.Name === name) {
      return latestIngressClass;
    }
    return undefined;
  }, [latestIngressClass, name]);
}
