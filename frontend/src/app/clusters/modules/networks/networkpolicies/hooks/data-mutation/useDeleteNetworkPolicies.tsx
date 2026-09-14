import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteNetworkPolicies } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_NETWORK_POLICIES } from "../../api/api.const";

export const useDeleteNetworkPolicies = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteNetworkPolicies(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NETWORK_POLICIES] });
      const count = items.length;
      renderSuccessToast({
        title: "NetworkPolicies deleted",
        description: `${count} networkpolicy${count === 1 ? "" : "ies"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete NetworkPolicies",
        description: `Error deleting NetworkPolicies: ${String(err)}`,
      }),
  });
};
