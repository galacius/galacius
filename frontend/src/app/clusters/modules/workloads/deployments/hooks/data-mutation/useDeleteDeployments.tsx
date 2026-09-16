import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteDeployments } from "@wailsjs/go/app/App";
import { QUERY_KEY_DEPLOYMENTS } from "../../api/api.const";

export const useDeleteDeployments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteDeployments(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DEPLOYMENTS] });
      const count = items.length;
      renderSuccessToast({
        title: "Deployments deleted",
        description: `${count} deployment${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete deployments",
        description: `Error deleting deployments: ${String(err)}`,
      }),
  });
};
