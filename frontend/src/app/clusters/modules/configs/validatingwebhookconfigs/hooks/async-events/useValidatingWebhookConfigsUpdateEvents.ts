import { startTransition, useEffect, useState } from "react";
import { EventsOn } from "@wailsjs/runtime/runtime";
import type { ValidatingWebhookConfig } from "../../api/resources";

export function useValidatingWebhookConfigsUpdateEvents(): ValidatingWebhookConfig[] {
  const [latestValidatingWebhookConfigs, setLatestValidatingWebhookConfigs] = useState<
    ValidatingWebhookConfig[]
  >([]);
  useEffect(() => {
    return EventsOn("validatingwebhookconfigs:update", (data: ValidatingWebhookConfig[]) => {
      startTransition(() => {
        setLatestValidatingWebhookConfigs(data);
      });
    });
  }, []);
  return latestValidatingWebhookConfigs;
}
