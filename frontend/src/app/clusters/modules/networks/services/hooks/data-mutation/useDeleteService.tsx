import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteService } from "@wailsjs/go/app/App";
import { QUERY_KEY_SERVICES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteService(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SERVICES] });
      renderSuccessToast({ title: "Service deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete Service",
        description: `${name}: ${String(err)}`,
      }),
  });
};
