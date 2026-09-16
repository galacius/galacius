import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateSecret } from "@wailsjs/go/app/App";
import {
  QUERY_KEY_SECRET_DETAIL,
  QUERY_KEY_SECRETS,
  QUERY_KEY_SECRET_YAML,
} from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateSecret = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      namespace,
      name,
      data,
    }: {
      namespace: string;
      name: string;
      data: Record<string, string>;
    }) => UpdateSecret(namespace, name, data),
    onSuccess: (_, { name }) =>
      renderSuccessToast({ title: "Secret updated", description: `${name} updated successfully` }),
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to update secret",
        description: `${name}: ${String(err)}`,
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SECRET_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SECRETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SECRET_YAML] });
    },
  });
};
