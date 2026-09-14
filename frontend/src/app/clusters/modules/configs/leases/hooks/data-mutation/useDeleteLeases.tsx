import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteLeases } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_LEASES } from "../../api/api.const";

export const useDeleteLeases = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteLeases(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LEASES] });
      const count = items.length;
      renderSuccessToast({
        title: "Leases deleted",
        description: `${count} lease${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete Leases",
        description: `Error deleting Leases: ${String(err)}`,
      }),
  });
};
