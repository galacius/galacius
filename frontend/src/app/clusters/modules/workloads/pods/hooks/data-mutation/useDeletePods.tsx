import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeletePods } from "@wailsjs/go/app/App";
import { QUERY_KEY_PODS } from "../../api/api.const";

export const useDeletePods = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeletePods(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PODS] });
      const count = items.length;
      renderSuccessToast({
        title: "Pods deleted",
        description: `${count} pod${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) => {
      renderErrorToast({
        title: "Failed to delete pods",
        description: `Error deleting pods: ${String(err)}`,
      });
    },
  });
};
