import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_CLUSTER_ROLES,
  QUERY_KEY_CLUSTER_ROLE_DETAIL,
  QUERY_KEY_CLUSTER_ROLE_YAML,
} from "../../api/api.const";
import { DeleteClusterRoles } from "@wailsjs/go/app/App";

export const useDeleteClusterRoles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ name: string }> }) => DeleteClusterRoles(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_YAML] });
      const count = items.length;
      renderSuccessToast({
        title: "ClusterRoles deleted",
        description: `${count} clusterrole${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete ClusterRoles",
        description: `Error deleting ClusterRoles: ${String(err)}`,
      }),
  });
};
