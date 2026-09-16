import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_CLUSTER_ROLES,
  QUERY_KEY_CLUSTER_ROLE_DETAIL,
  QUERY_KEY_CLUSTER_ROLE_YAML,
} from "../../api/api.const";
import { UpdateClusterRoleYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateClusterRoleYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yamlString }: { yamlString: string }) => UpdateClusterRoleYAML(yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_YAML] });
      renderSuccessToast({
        title: "ClusterRole updated",
        description: "ClusterRole updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update ClusterRole", description: String(err) }),
  });
};
