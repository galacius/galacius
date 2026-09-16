import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { IngressDetail } from "../../api/resources";
import { UnwatchIngressDetail, WatchIngressDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific Ingress (namespace/name)
// as "watched" with the backend (see App.WatchIngressDetail), then listens
// for "ingress:update" (singular — distinct from the "ingresses:update"
// list topic) pushes carrying a full IngressDetail. Only watched Ingresses
// are ever pushed on this topic. Used by useGetIngressDetail to merge live
// updates locally without invalidate/refetch.
export function useIngressUpdateEvents(namespace: string, name: string): IngressDetail | undefined {
  const [latestIngress, setLatestIngress] = useState<IngressDetail | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchIngressDetail(namespace, name);

    const cancel = EventsOn("ingress:update", (data: IngressDetail) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestIngress(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchIngressDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any value pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestIngress && latestIngress.Namespace === namespace && latestIngress.Name === name) {
      return latestIngress;
    }
    return undefined;
  }, [latestIngress, namespace, name]);
}
