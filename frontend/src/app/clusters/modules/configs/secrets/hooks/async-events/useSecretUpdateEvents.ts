import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { SecretDetail } from "../../api/resources";
import { UnwatchSecretDetail, WatchSecretDetail } from "../../api/resources";

// Scoped detail event hook: registers this specific Secret (namespace/name)
// as "watched" with the backend (see App.WatchSecretDetail), then listens for
// "secret:update" (singular — distinct from the "secrets:update" list topic)
// pushes carrying a full SecretDetail (including decoded Data). Only watched
// Secrets are ever pushed on this topic, so opening a drawer for one Secret
// never leaks its decoded contents to other subscribers. Used by
// useGetSecretDetail to merge live updates locally without invalidate/refetch.
export function useSecretUpdateEvents(namespace: string, name: string): SecretDetail | undefined {
  const [latestSecret, setLatestSecret] = useState<SecretDetail | undefined>(undefined);

  useEffect(() => {
    if (!namespace || !name) {
      return;
    }

    WatchSecretDetail(namespace, name);

    const cancel = EventsOn("secret:update", (data: SecretDetail) => {
      if (data.Namespace === namespace && data.Name === name) {
        startTransition(() => {
          setLatestSecret(data);
        });
      }
    });

    return () => {
      cancel();
      UnwatchSecretDetail(namespace, name);
    };
  }, [namespace, name]);

  // Discard any secret pushed for a previous namespace/name pair rather than
  // resetting state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestSecret && latestSecret.Namespace === namespace && latestSecret.Name === name) {
      return latestSecret;
    }
    return undefined;
  }, [latestSecret, namespace, name]);
}
