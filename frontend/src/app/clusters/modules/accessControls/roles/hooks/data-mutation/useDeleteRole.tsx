import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteRole } from "@wailsjs/go/app/App";
import { QUERY_KEY_ROLES } from "../../api/api.const";

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteRole(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ROLES] });
      renderSuccessToast({ title: "Role deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({ title: "Failed to delete Role", description: `${name}: ${String(err)}` }),
  });
};
