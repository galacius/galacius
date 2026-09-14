import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateConfigMapYAML } from "../../api/resources";
import { QUERY_KEY_CONFIGMAPS, QUERY_KEY_CONFIGMAP_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateConfigMapYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateConfigMapYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CONFIGMAPS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CONFIGMAP_YAML] });
      renderSuccessToast({
        title: "ConfigMap updated",
        description: "ConfigMap updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update ConfigMap", description: String(err) }),
  });
};
