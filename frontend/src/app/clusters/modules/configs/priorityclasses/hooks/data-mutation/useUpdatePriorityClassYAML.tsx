import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdatePriorityClassYAML } from "../../api/resources";
import { QUERY_KEY_PRIORITY_CLASSES, QUERY_KEY_PRIORITY_CLASS_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdatePriorityClassYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yamlString }: { yamlString: string }) => UpdatePriorityClassYAML(yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PRIORITY_CLASSES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PRIORITY_CLASS_YAML] });
      renderSuccessToast({
        title: "PriorityClass updated",
        description: "PriorityClass updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update PriorityClass", description: String(err) }),
  });
};
