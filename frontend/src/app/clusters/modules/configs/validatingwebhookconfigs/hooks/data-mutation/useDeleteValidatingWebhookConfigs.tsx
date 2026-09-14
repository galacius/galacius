import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_VALIDATING_WEBHOOK_CONFIGS,
  QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_DETAIL,
  QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_YAML,
} from "../../api/api.const";
import { DeleteValidatingWebhookConfigs } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteValidatingWebhookConfigs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ names }: { names: string[] }) => DeleteValidatingWebhookConfigs(names),
    onSuccess: (_, { names }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIGS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_VALIDATING_WEBHOOK_CONFIG_YAML] });
      const count = names.length;
      renderSuccessToast({
        title: "ValidatingWebhookConfigs deleted",
        description: `${count} validatingwebhookconfig${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete ValidatingWebhookConfigs",
        description: `Error deleting ValidatingWebhookConfigs: ${String(err)}`,
      }),
  });
};
