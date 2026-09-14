import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteNamespaces } from "@wailsjs/go/app/App";
import { QUERY_KEY_NAMESPACES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteNamespaces = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ names }: { names: string[] }) => DeleteNamespaces(names),
    onSuccess: (_, { names }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NAMESPACES] });
      const count = names.length;
      renderSuccessToast({
        title: "Namespaces deleted",
        description: `${count} namespace${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete Namespaces",
        description: `Error deleting Namespaces: ${String(err)}`,
      }),
  });
};
