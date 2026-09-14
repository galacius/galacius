import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteEndpointSlice } from "@wailsjs/go/app/App";
import { QUERY_KEY_ENDPOINT_SLICES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteEndpointSlice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteEndpointSlice(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ENDPOINT_SLICES] });
      renderSuccessToast({
        title: "EndpointSlice deleted",
        description: `${name} has been deleted`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete EndpointSlice",
        description: `${name}: ${String(err)}`,
      }),
  });
};
