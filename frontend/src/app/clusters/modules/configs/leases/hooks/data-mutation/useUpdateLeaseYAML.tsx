import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateLeaseYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_LEASES, QUERY_KEY_LEASE_YAML } from "../../api/api.const";

export const useUpdateLeaseYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateLeaseYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LEASES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LEASE_YAML] });
      renderSuccessToast({ title: "Lease updated", description: "Lease updated successfully" });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update Lease", description: String(err) }),
  });
};
