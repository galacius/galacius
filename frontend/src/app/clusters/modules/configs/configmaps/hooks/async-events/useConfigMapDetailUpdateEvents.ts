import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { ConfigMap } from "../../api/resources";
import { UnwatchConfigMapDetail, WatchConfigMapDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific ConfigMap (namespace/name) as
// "watched" with the backend (see App.WatchConfigMapDetail), then listens for
// "configmap:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetConfigMapDetail to merge live updates
// locally without invalidate/refetch.
export function useConfigMapDetailUpdateEvents(
  namespace: string,
  name: string
): ConfigMap | undefined {
  const [latestConfigMap, setLatestConfigMap] = useState<ConfigMap | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchConfigMapDetail(namespace, name);

    const cancel = EventsOn("configmap:update", (data: ConfigMap) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestConfigMap(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchConfigMapDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any ConfigMap pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (
      latestConfigMap &&
      latestConfigMap.Namespace === namespace &&
      latestConfigMap.Name === name
    ) {
      return latestConfigMap;
    }
    return undefined;
  }, [latestConfigMap, namespace, name]);
}
