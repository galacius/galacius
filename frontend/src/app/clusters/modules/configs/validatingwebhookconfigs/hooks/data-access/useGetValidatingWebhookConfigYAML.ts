import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_YAML } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { GetValidatingWebhookConfigYAML } from "../../api/resources";

export function useGetValidatingWebhookConfigYAML(context: string, name: string, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_YAML, { context, name }],
    queryFn: () => GetValidatingWebhookConfigYAML(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name && enabled,
  });
}
