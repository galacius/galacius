import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteEndpointSlices } from "@wailsjs/go/app/App";
import { QUERY_KEY_ENDPOINT_SLICES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteEndpointSlices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteEndpointSlices(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ENDPOINT_SLICES] });
      const count = items.length;
      renderSuccessToast({
        title: "EndpointSlices deleted",
        description: `${count} endpointslice${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete EndpointSlices",
        description: `Error deleting EndpointSlices: ${String(err)}`,
      }),
  });
};
