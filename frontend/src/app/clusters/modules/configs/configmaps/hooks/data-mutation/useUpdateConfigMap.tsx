import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateConfigMap } from "@wailsjs/go/app/App";
import {
  QUERY_KEY_CONFIGMAP_DETAIL,
  QUERY_KEY_CONFIGMAPS,
  QUERY_KEY_CONFIGMAP_YAML,
} from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateConfigMap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      namespace,
      name,
      data,
    }: {
      namespace: string;
      name: string;
      data: Record<string, string>;
    }) => UpdateConfigMap(namespace, name, data),
    onSuccess: (_, { name }) =>
      renderSuccessToast({
        title: "ConfigMap updated",
        description: `${name} updated successfully`,
      }),
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to update ConfigMap",
        description: `${name}: ${String(err)}`,
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CONFIGMAP_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CONFIGMAPS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CONFIGMAP_YAML] });
    },
  });
};
