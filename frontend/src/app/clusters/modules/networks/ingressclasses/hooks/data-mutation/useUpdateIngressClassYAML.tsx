import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_INGRESSCLASSES,
  QUERY_KEY_INGRESSCLASS_DETAIL,
  QUERY_KEY_INGRESS_CLASS_YAML,
} from "../../api/api.const";
import { UpdateIngressClassYAML } from "../../api/resources";

import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUpdateIngressClassYAML = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ yamlString }: { yamlString: string }) => UpdateIngressClassYAML(yamlString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSCLASSES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSCLASS_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESS_CLASS_YAML] });
      renderSuccessToast({
        title: "IngressClass updated",
        description: "IngressClass updated successfully",
      });
    },
    onError: (err) =>
      renderErrorToast({ title: "Failed to update IngressClass", description: String(err) }),
  });
};
