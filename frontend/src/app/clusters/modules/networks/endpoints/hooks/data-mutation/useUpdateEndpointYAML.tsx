import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateEndpointYAML } from "../../api/resources";
import { QUERY_KEY_ENDPOINT_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateEndpointYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateEndpointYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ENDPOINT_YAML] });
      renderSuccessToast({
        title: "Endpoint updated",
        description: "Endpoint updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update Endpoint", description: String(err) }),
  });
};
