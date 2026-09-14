import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeletePodDisruptionBudget } from "@wailsjs/go/app/App";
import { QUERY_KEY_PDBS } from "../../api/api.const";

export const useDeletePodDisruptionBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeletePodDisruptionBudget(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PDBS] });
      renderSuccessToast({
        title: "PodDisruptionBudget deleted",
        description: `${name} has been deleted`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete PodDisruptionBudget",
        description: `${name}: ${String(err)}`,
      }),
  });
};
