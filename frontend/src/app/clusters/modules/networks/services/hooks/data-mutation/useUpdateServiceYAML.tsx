import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateServiceYAML } from "../../api/resources";
import { QUERY_KEY_SERVICE_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateServiceYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateServiceYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SERVICE_YAML] });
      renderSuccessToast({ title: "Service updated", description: "Service updated successfully" });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update Service", description: String(err) }),
  });
};
