import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateRoleBindingYAML } from "../../api/resources";
import { QUERY_KEY_ROLE_BINDING_YAML } from "../../api/api.const";

export const useUpdateRoleBindingYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateRoleBindingYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ROLE_BINDING_YAML] });
      renderSuccessToast({
        title: "RoleBinding updated",
        description: "RoleBinding updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update RoleBinding", description: String(err) }),
  });
};
