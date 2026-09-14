import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { RoleBinding } from "../../api/resources";
import { UnwatchRoleBindingDetail, WatchRoleBindingDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific RoleBinding (namespace/name) as
// "watched" with the backend (see App.WatchRoleBindingDetail), then listens for
// "rolebinding:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetRoleBindingDetail to merge live updates
// locally without invalidate/refetch.
export function useRoleBindingDetailUpdateEvents(
  namespace: string,
  name: string
): RoleBinding | undefined {
  const [latestRoleBinding, setLatestRoleBinding] = useState<RoleBinding | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchRoleBindingDetail(namespace, name);

    const cancel = EventsOn("rolebinding:update", (data: RoleBinding) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestRoleBinding(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchRoleBindingDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any RoleBinding pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (
      latestRoleBinding &&
      latestRoleBinding.Namespace === namespace &&
      latestRoleBinding.Name === name
    ) {
      return latestRoleBinding;
    }
    return undefined;
  }, [latestRoleBinding, namespace, name]);
}
