import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_INGRESSCLASSES,
  QUERY_KEY_INGRESSCLASS_DETAIL,
  QUERY_KEY_INGRESS_CLASS_YAML,
} from "../../api/api.const";
import { DeleteIngressClass } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteIngressClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => DeleteIngressClass(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSCLASSES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSCLASS_DETAIL, { name }] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESS_CLASS_YAML, { name }] });
      renderSuccessToast({
        title: "IngressClass deleted",
        description: `${name} has been deleted`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete IngressClass",
        description: `${name}: ${String(err)}`,
      }),
  });
};
