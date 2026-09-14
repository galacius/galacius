import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteRoles } from "@wailsjs/go/app/App";
import { QUERY_KEY_ROLES } from "../../api/api.const";

export const useDeleteRoles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteRoles(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ROLES] });
      const count = items.length;
      renderSuccessToast({
        title: "Roles deleted",
        description: `${count} role${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete Roles",
        description: `Error deleting Roles: ${String(err)}`,
      }),
  });
};
