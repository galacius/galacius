import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteResourceQuota } from "@wailsjs/go/app/App";
import { QUERY_KEY_RESOURCE_QUOTAS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteResourceQuota = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteResourceQuota(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_RESOURCE_QUOTAS] });
      renderSuccessToast({
        title: "ResourceQuota deleted",
        description: `${name} has been deleted`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete ResourceQuota",
        description: `${name}: ${String(err)}`,
      }),
  });
};
