import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteServiceAccounts } from "@wailsjs/go/app/App";
import { QUERY_KEY_SERVICE_ACCOUNTS } from "../../api/api.const";

export const useDeleteServiceAccounts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteServiceAccounts(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SERVICE_ACCOUNTS] });
      const count = items.length;
      renderSuccessToast({
        title: "ServiceAccounts deleted",
        description: `${count} serviceaccount${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete ServiceAccounts",
        description: `Error deleting ServiceAccounts: ${String(err)}`,
      }),
  });
};
