import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateResourceQuota } from "@wailsjs/go/app/App";
import { QUERY_KEY_RESOURCE_QUOTAS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useCreateResourceQuota = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      namespace,
      name,
      hard,
    }: {
      namespace: string;
      name: string;
      hard: Record<string, string>;
    }) => CreateResourceQuota(namespace, name, hard),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_RESOURCE_QUOTAS] });
      renderSuccessToast({
        title: "ResourceQuota created",
        description: `${name} created successfully`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to create ResourceQuota",
        description: `${name}: ${String(err)}`,
      }),
  });
};
