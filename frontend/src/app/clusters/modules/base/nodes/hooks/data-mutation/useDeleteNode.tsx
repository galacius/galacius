import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteNode } from "@wailsjs/go/app/App";
import { QUERY_KEY_NODES, QUERY_KEY_NODE_DETAIL, QUERY_KEY_NODE_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteNode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => DeleteNode(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODE_DETAIL, { name }] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODE_YAML, { name }] });
      renderSuccessToast({ title: "Node deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({ title: "Failed to delete Node", description: `${name}: ${String(err)}` }),
  });
};
