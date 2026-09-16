import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdatePersistentVolumeYAML } from "../../api/resources";
import { QUERY_KEY_PVS, QUERY_KEY_PERSISTENT_VOLUME_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdatePersistentVolumeYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yamlString }: { yamlString: string }) => UpdatePersistentVolumeYAML(yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PVS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PERSISTENT_VOLUME_YAML] });
      renderSuccessToast({
        title: "PersistentVolume updated",
        description: "PersistentVolume updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update PersistentVolume", description: String(err) }),
  });
};
