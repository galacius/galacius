import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { ServiceAccount } from "../../api/resources";
import { UnwatchServiceAccountDetail, WatchServiceAccountDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific ServiceAccount (namespace/name) as
// "watched" with the backend (see App.WatchServiceAccountDetail), then listens for
// "serviceaccount:update" (singular — distinct from the plural list topic) pushes carrying
// the full detail payload. Used by useGetServiceAccountDetail to merge live updates
// locally without invalidate/refetch.
export function useServiceAccountDetailUpdateEvents(
  namespace: string,
  name: string
): ServiceAccount | undefined {
  const [latestServiceAccount, setLatestServiceAccount] = useState<ServiceAccount | undefined>(
    undefined
  );

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchServiceAccountDetail(namespace, name);

    const cancel = EventsOn("serviceaccount:update", (data: ServiceAccount) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestServiceAccount(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchServiceAccountDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any ServiceAccount pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (
      latestServiceAccount &&
      latestServiceAccount.Namespace === namespace &&
      latestServiceAccount.Name === name
    ) {
      return latestServiceAccount;
    }
    return undefined;
  }, [latestServiceAccount, namespace, name]);
}
