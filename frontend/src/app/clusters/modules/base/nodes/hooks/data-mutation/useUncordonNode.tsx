import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UncordonNode } from "@wailsjs/go/app/App";
import { QUERY_KEY_NODES, QUERY_KEY_NODE_DETAIL } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUncordonNode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => UncordonNode(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODE_DETAIL, { name }] });
      renderSuccessToast({ title: "Node uncordoned", description: `${name} has been uncordoned` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to uncordon Node",
        description: `${name}: ${String(err)}`,
      }),
  });
};
