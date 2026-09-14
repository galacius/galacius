import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateHPAYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_HPA_YAML } from "../../api/api.const";

export const useUpdateHPAYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateHPAYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HPA_YAML] });
      renderSuccessToast({ title: "HPA updated", description: "HPA updated successfully" });
    },
    onError: (err) => renderErrorToast({ title: "Failed to update HPA", description: String(err) }),
  });
};
