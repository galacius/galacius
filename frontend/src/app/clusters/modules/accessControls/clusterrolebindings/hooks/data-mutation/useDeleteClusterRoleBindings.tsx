import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_CLUSTER_ROLE_BINDINGS,
  QUERY_KEY_CLUSTER_ROLE_BINDING_DETAIL,
  QUERY_KEY_CLUSTER_ROLE_BINDING_YAML,
} from "../../api/api.const";
import { DeleteClusterRoleBindings } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteClusterRoleBindings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ name: string }> }) => DeleteClusterRoleBindings(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDINGS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDING_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDING_YAML] });
      const count = items.length;
      renderSuccessToast({
        title: "ClusterRoleBindings deleted",
        description: `${count} clusterrolebinding${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete ClusterRoleBindings",
        description: `Error deleting ClusterRoleBindings: ${String(err)}`,
      }),
  });
};
