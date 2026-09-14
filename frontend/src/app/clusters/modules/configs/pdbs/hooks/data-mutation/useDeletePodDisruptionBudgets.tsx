import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeletePodDisruptionBudgets } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_PDBS } from "../../api/api.const";

export const useDeletePodDisruptionBudgets = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeletePodDisruptionBudgets(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PDBS] });
      const count = items.length;
      renderSuccessToast({
        title: "PodDisruptionBudgets deleted",
        description: `${count} poddisruptionbudget${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete PodDisruptionBudgets",
        description: `Error deleting PodDisruptionBudgets: ${String(err)}`,
      }),
  });
};
