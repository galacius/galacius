import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateResourceQuotaYAML } from "../../api/resources";
import { QUERY_KEY_RESOURCE_QUOTAS, QUERY_KEY_RESOURCE_QUOTA_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateResourceQuotaYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateResourceQuotaYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_RESOURCE_QUOTAS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_RESOURCE_QUOTA_YAML] });
      renderSuccessToast({
        title: "ResourceQuota updated",
        description: "ResourceQuota updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update ResourceQuota", description: String(err) }),
  });
};
