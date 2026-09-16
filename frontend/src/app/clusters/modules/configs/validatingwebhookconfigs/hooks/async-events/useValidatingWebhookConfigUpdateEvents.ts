import { EventsOn } from "@wailsjs/runtime/runtime";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { ValidatingWebhookConfigDetail } from "../../api/resources";
import {
  UnwatchValidatingWebhookConfigDetail,
  WatchValidatingWebhookConfigDetail,
} from "../../api/resources";

// Scoped detail event hook: registers this specific (cluster-scoped)
// ValidatingWebhookConfig as "watched" with the backend (see
// App.WatchValidatingWebhookConfigDetail), then listens for
// "validatingwebhookconfig:update" (singular — distinct from the
// "validatingwebhookconfigs:update" list topic) pushes carrying a full
// ValidatingWebhookConfigDetail. Only the watched config is ever pushed on
// this topic. Used by useGetValidatingWebhookConfigDetail to merge live
// updates locally without invalidate/refetch.
export function useValidatingWebhookConfigUpdateEvents(
  name: string
): ValidatingWebhookConfigDetail | undefined {
  const [latestConfig, setLatestConfig] = useState<ValidatingWebhookConfigDetail | undefined>(
    undefined
  );

  useEffect(() => {
    if (!name) {
      return;
    }

    WatchValidatingWebhookConfigDetail(name);

    const cancel = EventsOn(
      "validatingwebhookconfig:update",
      (data: ValidatingWebhookConfigDetail) => {
        if (data.Name === name) {
          startTransition(() => {
            setLatestConfig(data);
          });
        }
      }
    );

    return () => {
      cancel();
      UnwatchValidatingWebhookConfigDetail(name);
    };
  }, [name]);

  // Discard any value pushed for a previous name rather than resetting
  // state synchronously in the effect above (which would trigger a
  // cascading render).
  return useMemo(() => {
    if (latestConfig && latestConfig.Name === name) {
      return latestConfig;
    }
    return undefined;
  }, [latestConfig, name]);
}
