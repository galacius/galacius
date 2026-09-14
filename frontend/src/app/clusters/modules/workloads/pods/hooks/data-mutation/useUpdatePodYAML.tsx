import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY_POD_YAML } from "../../api/api.const";
import { UpdatePodYAML } from "../../api/resources";

export const useUpdatePodYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdatePodYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_POD_YAML] });
      renderSuccessToast({ title: "Pod updated", description: "Pod updated successfully" });
    },
    onError: (err) => {
      renderErrorToast({ title: "Failed to update Pod", description: String(err) });
    },
  });
};
