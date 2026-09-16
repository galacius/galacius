import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteRoleBindings } from "@wailsjs/go/app/App";
import { QUERY_KEY_ROLE_BINDINGS } from "../../api/api.const";

export const useDeleteRoleBindings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteRoleBindings(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ROLE_BINDINGS] });
      const count = items.length;
      renderSuccessToast({
        title: "RoleBindings deleted",
        description: `${count} rolebinding${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete RoleBindings",
        description: `Error deleting RoleBindings: ${String(err)}`,
      }),
  });
};
