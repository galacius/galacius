import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScaleReplicaSet } from "@wailsjs/go/app/App";
import { QUERY_KEY_REPLICASETS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useScaleReplicaSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      namespace,
      name,
      replicas,
    }: {
      namespace: string;
      name: string;
      replicas: number;
    }) => ScaleReplicaSet(namespace, name, replicas),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_REPLICASETS] });
      renderSuccessToast({
        title: "ReplicaSet scaled",
        description: `${name} scaled successfully`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to scale ReplicaSet",
        description: `${name}: ${String(err)}`,
      }),
  });
};
