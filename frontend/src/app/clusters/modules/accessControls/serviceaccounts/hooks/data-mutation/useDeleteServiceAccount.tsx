import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteServiceAccount } from "@wailsjs/go/app/App";
import { QUERY_KEY_SERVICE_ACCOUNTS } from "../../api/api.const";

export const useDeleteServiceAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteServiceAccount(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SERVICE_ACCOUNTS] });
      renderSuccessToast({
        title: "ServiceAccount deleted",
        description: `${name} has been deleted`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete ServiceAccount",
        description: `${name}: ${String(err)}`,
      }),
  });
};
