import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateIngressYAML } from "../../api/resources";
import { QUERY_KEY_INGRESS_YAML } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateIngressYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, yamlString }: { namespace: string; yamlString: string }) =>
      UpdateIngressYAML(namespace, yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESS_YAML] });
      renderSuccessToast({ title: "Ingress updated", description: "Ingress updated successfully" });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update Ingress", description: String(err) }),
  });
};
