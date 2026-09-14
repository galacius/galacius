import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DrainNode } from "@wailsjs/go/app/App";
import { QUERY_KEY_NODES, QUERY_KEY_NODE_DETAIL } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDrainNode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => DrainNode(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODE_DETAIL, { name }] });
      renderSuccessToast({ title: "Node drained", description: `${name} has been drained` });
    },
    onError: (err, { name }) =>
      renderErrorToast({ title: "Failed to drain Node", description: `${name}: ${String(err)}` }),
  });
};
