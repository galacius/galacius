import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UnsetIngressClassAsDefault } from "../../api/resources";
import {
  QUERY_KEY_INGRESSCLASS_DETAIL,
  QUERY_KEY_INGRESSCLASSES,
  QUERY_KEY_INGRESS_CLASS_YAML,
} from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useUnsetIngressClassAsDefault = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => UnsetIngressClassAsDefault(name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSCLASSES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSCLASS_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESS_CLASS_YAML] });
      renderSuccessToast({
        title: "Default ingress class unset",
        description: `${name} is no longer the default`,
      });
    },
    onError: (err, name) =>
      renderErrorToast({
        title: "Failed to unset default",
        description: `${name}: ${String(err)}`,
      }),
  });
};
