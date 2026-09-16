import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateEndpointSliceYAML } from "../../api/resources";
import { QUERY_KEY_ENDPOINT_SLICE_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateEndpointSliceYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateEndpointSliceYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ENDPOINT_SLICE_YAML] });
      renderSuccessToast({
        title: "EndpointSlice updated",
        description: "EndpointSlice updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update EndpointSlice", description: String(err) }),
  });
};
