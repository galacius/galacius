import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteReplicaSet } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_REPLICASETS } from "../../api/api.const";

export const useDeleteReplicaSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteReplicaSet(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_REPLICASETS] });
      renderSuccessToast({ title: "ReplicaSet deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete ReplicaSet",
        description: `${name}: ${String(err)}`,
      }),
  });
};
