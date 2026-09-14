import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { ClusterRole } from "../../api/resources";
import { UnwatchClusterRoleDetail, WatchClusterRoleDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific ClusterRole (name) as "watched"
// with the backend (see App.WatchClusterRoleDetail), then listens for "clusterrole:update"
// (singular — distinct from the plural list topic) pushes carrying the full
// detail payload. Used by useGetClusterRoleDetail to merge live updates locally
// without invalidate/refetch.
export function useClusterRoleDetailUpdateEvents(name: string): ClusterRole | undefined {
  const [latestClusterRole, setLatestClusterRole] = useState<ClusterRole | undefined>(undefined);

  useEffect(() => {
    if (!name) {
      return;
    }

    WatchClusterRoleDetail(name);

    const cancel = EventsOn("clusterrole:update", (data: ClusterRole) => {
      if (data.Name === name) {
        startTransition(() => {
          setLatestClusterRole(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchClusterRoleDetail(name);
    };
  }, [name]);

  // Discard any ClusterRole pushed for a previous name rather than resetting state
  // synchronously in the effect above (which would trigger a cascading render).
  return useMemo(() => {
    if (latestClusterRole && latestClusterRole.Name === name) {
      return latestClusterRole;
    }
    return undefined;
  }, [latestClusterRole, name]);
}
