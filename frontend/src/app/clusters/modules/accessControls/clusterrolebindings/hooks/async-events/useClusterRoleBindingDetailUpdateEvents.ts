import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { ClusterRoleBinding } from "../../api/resources";
import {
  UnwatchClusterRoleBindingDetail,
  WatchClusterRoleBindingDetail,
} from "../../api/resources";

// Scoped detail event hook: registers this specific ClusterRoleBinding (name) as "watched"
// with the backend (see App.WatchClusterRoleBindingDetail), then listens for "clusterrolebinding:update"
// (singular — distinct from the plural list topic) pushes carrying the full
// detail payload. Used by useGetClusterRoleBindingDetail to merge live updates locally
// without invalidate/refetch.
export function useClusterRoleBindingDetailUpdateEvents(
  name: string
): ClusterRoleBinding | undefined {
  const [latestClusterRoleBinding, setLatestClusterRoleBinding] = useState<
    ClusterRoleBinding | undefined
  >(undefined);

  useEffect(() => {
    if (!name) {
      return;
    }

    WatchClusterRoleBindingDetail(name);

    const cancel = EventsOn("clusterrolebinding:update", (data: ClusterRoleBinding) => {
      if (data.Name === name) {
        startTransition(() => {
          setLatestClusterRoleBinding(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchClusterRoleBindingDetail(name);
    };
  }, [name]);

  // Discard any ClusterRoleBinding pushed for a previous name rather than resetting state
  // synchronously in the effect above (which would trigger a cascading render).
  return useMemo(() => {
    if (latestClusterRoleBinding && latestClusterRoleBinding.Name === name) {
      return latestClusterRoleBinding;
    }
    return undefined;
  }, [latestClusterRoleBinding, name]);
}
