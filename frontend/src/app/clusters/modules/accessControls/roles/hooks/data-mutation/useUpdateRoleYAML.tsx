import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateRoleYAML } from "../../api/resources";
import { QUERY_KEY_ROLE_YAML } from "../../api/api.const";

export const useUpdateRoleYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateRoleYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ROLE_YAML] });
      renderSuccessToast({ title: "Role updated", description: "Role updated successfully" });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update Role", description: String(err) }),
  });
};
