import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_CLUSTER_ROLES,
  QUERY_KEY_CLUSTER_ROLE_DETAIL,
  QUERY_KEY_CLUSTER_ROLE_YAML,
} from "../../api/api.const";
import { DeleteClusterRole } from "@wailsjs/go/app/App";

export const useDeleteClusterRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => DeleteClusterRole(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_DETAIL, { name }] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CLUSTER_ROLE_YAML, { name }] });
      renderSuccessToast({ title: "ClusterRole deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete ClusterRole",
        description: `${name}: ${String(err)}`,
      }),
  });
};
