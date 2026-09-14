import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteStatefulSets } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_STATEFULSETS } from "../../api/api.const";

export const useDeleteStatefulSets = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteStatefulSets(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATEFULSETS] });
      const count = items.length;
      renderSuccessToast({
        title: "StatefulSets deleted",
        description: `${count} statefulset${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete StatefulSets",
        description: `Error deleting StatefulSets: ${String(err)}`,
      }),
  });
};
