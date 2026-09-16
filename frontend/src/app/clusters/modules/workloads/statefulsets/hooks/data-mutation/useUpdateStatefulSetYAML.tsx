import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateStatefulSetYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_STATEFULSETS, QUERY_KEY_STATEFULSET_YAML } from "../../api/api.const";

export const useUpdateStatefulSetYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateStatefulSetYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATEFULSETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATEFULSET_YAML] });
      renderSuccessToast({
        title: "StatefulSet updated",
        description: "StatefulSet updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update StatefulSet", description: String(err) }),
  });
};
