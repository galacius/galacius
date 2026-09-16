import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteSecret } from "@wailsjs/go/app/App";
import { QUERY_KEY_SECRETS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteSecret = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteSecret(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SECRETS] });
      renderSuccessToast({ title: "Secret deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete Secret",
        description: `${name}: ${String(err)}`,
      }),
  });
};
