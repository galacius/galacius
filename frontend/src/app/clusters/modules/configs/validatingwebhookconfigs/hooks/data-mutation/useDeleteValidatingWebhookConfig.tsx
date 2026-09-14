import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_VALIDATING_WEBHOOK_CONFIGS,
  QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_DETAIL,
  QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_YAML,
} from "../../api/api.const";
import { DeleteValidatingWebhookConfig } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteValidatingWebhookConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => DeleteValidatingWebhookConfig(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIGS] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_DETAIL, { name }],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_YAML, { name }],
      });
      renderSuccessToast({
        title: "ValidatingWebhookConfig deleted",
        description: `${name} has been deleted`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete ValidatingWebhookConfig",
        description: `${name}: ${String(err)}`,
      }),
  });
};
