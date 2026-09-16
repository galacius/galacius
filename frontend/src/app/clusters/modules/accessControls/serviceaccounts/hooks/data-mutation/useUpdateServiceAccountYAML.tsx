import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateServiceAccountYAML } from "../../api/resources";
import { QUERY_KEY_SERVICE_ACCOUNT_YAML } from "../../api/api.const";

export const useUpdateServiceAccountYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateServiceAccountYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SERVICE_ACCOUNT_YAML] });
      renderSuccessToast({
        title: "ServiceAccount updated",
        description: "ServiceAccount updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update ServiceAccount", description: String(err) }),
  });
};
