import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { Role } from "../../api/resources";
import { UnwatchRoleDetail, WatchRoleDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific Role (namespace/name) as
// "watched" with the backend (see App.WatchRoleDetail), then listens for
// "role:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetRoleDetail to merge live updates
// locally without invalidate/refetch.
export function useRoleDetailUpdateEvents(namespace: string, name: string): Role | undefined {
  const [latestRole, setLatestRole] = useState<Role | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchRoleDetail(namespace, name);

    const cancel = EventsOn("role:update", (data: Role) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestRole(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchRoleDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any Role pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestRole && latestRole.Namespace === namespace && latestRole.Name === name) {
      return latestRole;
    }
    return undefined;
  }, [latestRole, namespace, name]);
}
