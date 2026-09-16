import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_VALIDATING_WEBHOOK_CONFIGS,
  QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_DETAIL,
  QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_YAML,
} from "../../api/api.const";
import { UpdateValidatingWebhookConfigYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateValidatingWebhookConfigYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yamlString }: { yamlString: string }) =>
      UpdateValidatingWebhookConfigYAML(yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIGS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_YAML] });
      renderSuccessToast({
        title: "ValidatingWebhookConfig updated",
        description: "ValidatingWebhookConfig updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to update ValidatingWebhookConfig",
        description: String(err),
      }),
  });
};
