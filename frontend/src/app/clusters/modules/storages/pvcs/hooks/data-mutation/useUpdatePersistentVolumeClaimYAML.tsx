import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdatePersistentVolumeClaimYAML } from "../../api/resources";
import { QUERY_KEY_PVCS, QUERY_KEY_PERSISTENTVOLUMECLAIM_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdatePersistentVolumeClaimYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdatePersistentVolumeClaimYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PVCS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PERSISTENTVOLUMECLAIM_YAML] });
      renderSuccessToast({
        title: "PersistentVolumeClaim updated",
        description: "PersistentVolumeClaim updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to update PersistentVolumeClaim",
        description: String(err),
      }),
  });
};
