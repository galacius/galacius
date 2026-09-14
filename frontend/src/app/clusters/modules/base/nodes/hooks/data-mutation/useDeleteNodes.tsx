import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteNodes } from "@wailsjs/go/app/App";
import { QUERY_KEY_NODES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteNodes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ names }: { names: string[] }) => DeleteNodes(names),
    onSuccess: (_, { names }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NODES] });
      const count = names.length;
      renderSuccessToast({
        title: "Nodes deleted",
        description: `${count} node${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete Nodes",
        description: `Error deleting Nodes: ${String(err)}`,
      }),
  });
};
