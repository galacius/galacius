import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteReplicaSets } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_REPLICASETS } from "../../api/api.const";

export const useDeleteReplicaSets = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteReplicaSets(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_REPLICASETS] });
      const count = items.length;
      renderSuccessToast({
        title: "ReplicaSets deleted",
        description: `${count} replicaset${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete ReplicaSets",
        description: `Error deleting ReplicaSets: ${String(err)}`,
      }),
  });
};
