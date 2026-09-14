import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CordonNode } from "@wailsjs/go/app/App";
import { QUERY_KEY_NODES, QUERY_KEY_NODE_DETAIL } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useCordonNode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => CordonNode(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODE_DETAIL, { name }] });
      renderSuccessToast({ title: "Node cordoned", description: `${name} has been cordoned` });
    },
    onError: (err, { name }) =>
      renderErrorToast({ title: "Failed to cordon Node", description: `${name}: ${String(err)}` }),
  });
};
