import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteDaemonSets } from "@wailsjs/go/app/App";
import { QUERY_KEY_DAEMONSETS } from "../../api/api.const";

export const useDeleteDaemonSets = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteDaemonSets(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DAEMONSETS] });
      const count = items.length;
      renderSuccessToast({
        title: "DaemonSets deleted",
        description: `${count} daemonset${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete DaemonSets",
        description: `Error deleting DaemonSets: ${String(err)}`,
      }),
  });
};
