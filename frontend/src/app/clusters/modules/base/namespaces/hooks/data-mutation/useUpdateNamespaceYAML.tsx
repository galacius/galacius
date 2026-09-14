import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateNamespaceYAML } from "@wailsjs/go/app/App";
import { QUERY_KEY_NAMESPACES, QUERY_KEY_NAMESPACE_YAML } from "../../api/api.const";

export const useUpdateNamespaceYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yamlString }: { yamlString: string }) => UpdateNamespaceYAML(yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NAMESPACES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NAMESPACE_YAML] });
      renderSuccessToast({
        title: "Namespace updated",
        description: "Namespace updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update Namespace", description: String(err) }),
  });
};
