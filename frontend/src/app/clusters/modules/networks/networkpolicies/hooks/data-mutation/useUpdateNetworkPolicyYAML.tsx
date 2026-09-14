import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateNetworkPolicyYAML } from "../../api/resources";

import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_NETWORK_POLICY_YAML } from "../../api/api.const";

export const useUpdateNetworkPolicyYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateNetworkPolicyYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NETWORK_POLICY_YAML] });
      renderSuccessToast({
        title: "NetworkPolicy updated",
        description: "NetworkPolicy updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update NetworkPolicy", description: String(err) }),
  });
};
