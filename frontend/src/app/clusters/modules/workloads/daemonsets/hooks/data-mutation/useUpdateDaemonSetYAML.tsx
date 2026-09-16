import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateDaemonSetYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_DAEMONSETS, QUERY_KEY_DAEMONSET_YAML } from "../../api/api.const";

export const useUpdateDaemonSetYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateDaemonSetYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DAEMONSETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DAEMONSET_YAML] });
      renderSuccessToast({
        title: "DaemonSet updated",
        description: "DaemonSet updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update DaemonSet", description: String(err) }),
  });
};
