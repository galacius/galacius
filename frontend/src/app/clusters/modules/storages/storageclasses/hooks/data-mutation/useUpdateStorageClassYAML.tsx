import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateStorageClassYAML } from "../../api/resources";
import { QUERY_KEY_STORAGE_CLASSES, QUERY_KEY_STORAGE_CLASS_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateStorageClassYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yamlString }: { yamlString: string }) => UpdateStorageClassYAML(yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STORAGE_CLASSES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STORAGE_CLASS_YAML] });
      renderSuccessToast({
        title: "StorageClass updated",
        description: "StorageClass updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update StorageClass", description: String(err) }),
  });
};
