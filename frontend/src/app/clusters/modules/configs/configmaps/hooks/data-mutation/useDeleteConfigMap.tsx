import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteConfigMap } from "@wailsjs/go/app/App";
import { QUERY_KEY_CONFIGMAPS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteConfigMap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteConfigMap(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CONFIGMAPS] });
      renderSuccessToast({ title: "ConfigMap deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete ConfigMap",
        description: `${name}: ${String(err)}`,
      }),
  });
};
