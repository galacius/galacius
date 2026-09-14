import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateSecretYAML } from "../../api/resources";
import { QUERY_KEY_SECRETS, QUERY_KEY_SECRET_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateSecretYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateSecretYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SECRETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SECRET_YAML] });
      renderSuccessToast({ title: "Secret updated", description: "Secret updated successfully" });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update Secret", description: String(err) }),
  });
};
