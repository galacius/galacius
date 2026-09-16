import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteEndpoint } from "@wailsjs/go/app/App";
import { QUERY_KEY_ENDPOINTS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteEndpoint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteEndpoint(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ENDPOINTS] });
      renderSuccessToast({ title: "Endpoint deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete Endpoint",
        description: `${name}: ${String(err)}`,
      }),
  });
};
