import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_CLUSTER_ROLE_BINDINGS,
  QUERY_KEY_CLUSTER_ROLE_BINDING_DETAIL,
  QUERY_KEY_CLUSTER_ROLE_BINDING_YAML,
} from "../../api/api.const";
import { UpdateClusterRoleBindingYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateClusterRoleBindingYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yamlString }: { yamlString: string }) =>
      UpdateClusterRoleBindingYAML(yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDINGS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDING_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDING_YAML] });
      renderSuccessToast({
        title: "ClusterRoleBinding updated",
        description: "ClusterRoleBinding updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update ClusterRoleBinding", description: String(err) }),
  });
};
