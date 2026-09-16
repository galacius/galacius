import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { Namespace } from "../../api/resources";
import { UnwatchNamespaceDetail, WatchNamespaceDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific Namespace (name) as "watched"
// with the backend (see App.WatchNamespaceDetail), then listens for "namespace:update"
// (singular — distinct from the plural list topic) pushes carrying the full
// detail payload. Used by useGetNamespaceDetail to merge live updates locally
// without invalidate/refetch.
export function useNamespaceDetailUpdateEvents(name: string): Namespace | undefined {
  const [latestNamespace, setLatestNamespace] = useState<Namespace | undefined>(undefined);

  useEffect(() => {
    if (!name) {
      return;
    }

    WatchNamespaceDetail(name);

    const cancel = EventsOn("namespace:update", (data: Namespace) => {
      if (data.Name === name) {
        startTransition(() => {
          setLatestNamespace(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchNamespaceDetail(name);
    };
  }, [name]);

  // Discard any Namespace pushed for a previous name rather than resetting state
  // synchronously in the effect above (which would trigger a cascading render).
  return useMemo(() => {
    if (latestNamespace && latestNamespace.Name === name) {
      return latestNamespace;
    }
    return undefined;
  }, [latestNamespace, name]);
}
