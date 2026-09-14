import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateNodeYAML } from "@wailsjs/go/app/App";
import { QUERY_KEY_NODES, QUERY_KEY_NODE_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateNodeYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yamlString }: { yamlString: string }) => UpdateNodeYAML(yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODE_YAML] });
      renderSuccessToast({ title: "Node updated", description: "Node updated successfully" });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update Node", description: String(err) }),
  });
};
