import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_VALIDATING_WEBHOOK_CONFIGS } from "../../api/api.const";
import type { ValidatingWebhookConfig } from "../../api/resources";
import { ListValidatingWebhookConfigs } from "../../api/resources";
import { useValidatingWebhookConfigsUpdateEvents } from "../async-events/useValidatingWebhookConfigsUpdateEvents";

export const useGetValidatingWebhookConfigs = (
  context: string,
  callback?: UseQueryCallback<ValidatingWebhookConfig[]>
) => {
  const latestValidatingWebhookConfigs = useValidatingWebhookConfigsUpdateEvents();
  const query = useQuery<ValidatingWebhookConfig[], Error>({
    queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIGS, context],
    queryFn: () => ListValidatingWebhookConfigs(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  const mergedData = useMemo(() => {
    let baseData = query.data;
    if (latestValidatingWebhookConfigs.length) baseData = latestValidatingWebhookConfigs;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestValidatingWebhookConfigs, query.data, callback]);

  return { ...query, data: mergedData };
};
