import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdatePDBYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_PDB_YAML } from "../../api/api.const";

export const useUpdatePDBYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdatePDBYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PDB_YAML] });
      renderSuccessToast({
        title: "PodDisruptionBudget updated",
        description: "PodDisruptionBudget updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update PodDisruptionBudget", description: String(err) }),
  });
};
