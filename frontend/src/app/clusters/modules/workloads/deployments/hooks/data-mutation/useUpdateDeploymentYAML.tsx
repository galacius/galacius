import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateDeploymentYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_DEPLOYMENTS, QUERY_KEY_DEPLOYMENT_YAML } from "../../api/api.const";

export const useUpdateDeploymentYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateDeploymentYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DEPLOYMENTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DEPLOYMENT_YAML] });
      renderSuccessToast({
        title: "Deployment updated",
        description: "Deployment updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update Deployment", description: String(err) }),
  });
};
