import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteRoleBinding } from "@wailsjs/go/app/App";
import { QUERY_KEY_ROLE_BINDINGS } from "../../api/api.const";

export const useDeleteRoleBinding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteRoleBinding(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ROLE_BINDINGS] });
      renderSuccessToast({ title: "RoleBinding deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete RoleBinding",
        description: `${name}: ${String(err)}`,
      }),
  });
};
