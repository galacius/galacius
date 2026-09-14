import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_DETAIL } from "../../api/api.const";
import type { ValidatingWebhookConfigDetail } from "../../api/resources";
import { GetValidatingWebhookConfigByName } from "../../api/resources";
import { useValidatingWebhookConfigUpdateEvents } from "../async-events/useValidatingWebhookConfigUpdateEvents";

export const useGetValidatingWebhookConfigDetail = (context: string, name: string) => {
  const latestConfig = useValidatingWebhookConfigUpdateEvents(name);

  const query = useQuery<ValidatingWebhookConfigDetail, Error>({
    queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_DETAIL, { context, name }],
    queryFn: () => GetValidatingWebhookConfigByName(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestConfig) return latestConfig;
    return query.data;
  }, [latestConfig, query.data]);

  return { ...query, data: mergedData };
};
