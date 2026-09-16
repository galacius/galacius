import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteResourceQuotas } from "@wailsjs/go/app/App";
import { QUERY_KEY_RESOURCE_QUOTAS } from "../../api/api.const";

export const useDeleteResourceQuotas = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteResourceQuotas(items),
    onSuccess: (_, { items }) => {
      const count = items.length;
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_RESOURCE_QUOTAS] });
      renderSuccessToast({
        title: "ResourceQuotas deleted",
        description: `${count} resourcequota${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete ResourceQuotas",
        description: `Error deleting ResourceQuotas: ${String(err)}`,
      }),
  });
};
