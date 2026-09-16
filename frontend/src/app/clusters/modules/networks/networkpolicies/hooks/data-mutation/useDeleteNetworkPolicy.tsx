import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteNetworkPolicy } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_NETWORK_POLICIES } from "../../api/api.const";

export const useDeleteNetworkPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteNetworkPolicy(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NETWORK_POLICIES] });
      renderSuccessToast({
        title: "NetworkPolicy deleted",
        description: `${name} has been deleted`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete NetworkPolicy",
        description: `${name}: ${String(err)}`,
      }),
  });
};
