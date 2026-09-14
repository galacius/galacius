import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_CLUSTER_ROLE_BINDINGS,
  QUERY_KEY_CLUSTER_ROLE_BINDING_DETAIL,
  QUERY_KEY_CLUSTER_ROLE_BINDING_YAML,
} from "../../api/api.const";
import { DeleteClusterRoleBinding } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteClusterRoleBinding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => DeleteClusterRoleBinding(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDINGS] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDING_DETAIL, { name }],
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDING_YAML, { name }] });
      renderSuccessToast({
        title: "ClusterRoleBinding deleted",
        description: `${name} has been deleted`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete ClusterRoleBinding",
        description: `${name}: ${String(err)}`,
      }),
  });
};
