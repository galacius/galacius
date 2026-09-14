import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateLimitRangeYAML } from "../../api/resources";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_LIMITRANGE_YAML } from "../../api/api.const";

export const useUpdateLimitRangeYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateLimitRangeYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LIMITRANGE_YAML] });
      renderSuccessToast({
        title: "LimitRange updated",
        description: "LimitRange updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update LimitRange", description: String(err) }),
  });
};
