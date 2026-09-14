import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateReplicaSetYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_REPLICASETS, QUERY_KEY_REPLICASET_YAML } from "../../api/api.const";

export const useUpdateReplicaSetYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateReplicaSetYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_REPLICASETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_REPLICASET_YAML] });
      renderSuccessToast({
        title: "ReplicaSet updated",
        description: "ReplicaSet updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update ReplicaSet", description: String(err) }),
  });
};
