import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteEndpoints } from "@wailsjs/go/app/App";
import { QUERY_KEY_ENDPOINTS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteEndpoints = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteEndpoints(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ENDPOINTS] });
      const count = items.length;
      renderSuccessToast({
        title: "Endpoints deleted",
        description: `${count} endpoint${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete Endpoints",
        description: `Error deleting Endpoints: ${String(err)}`,
      }),
  });
};
