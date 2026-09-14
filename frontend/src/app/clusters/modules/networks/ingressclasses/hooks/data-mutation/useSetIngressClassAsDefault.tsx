import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SetIngressClassAsDefault } from "../../api/resources";
import {
  QUERY_KEY_INGRESSCLASS_DETAIL,
  QUERY_KEY_INGRESSCLASSES,
  QUERY_KEY_INGRESS_CLASS_YAML,
} from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useSetIngressClassAsDefault = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => SetIngressClassAsDefault(name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSCLASSES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSCLASS_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESS_CLASS_YAML] });
      renderSuccessToast({
        title: "Default ingress class set",
        description: `${name} is now the default`,
      });
    },
    onError: (err, name) =>
      renderErrorToast({ title: "Failed to set default", description: `${name}: ${String(err)}` }),
  });
};
