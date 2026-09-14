import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QUERY_KEY_INGRESSCLASSES,
  QUERY_KEY_INGRESSCLASS_DETAIL,
  QUERY_KEY_INGRESS_CLASS_YAML,
} from "../../api/api.const";
import { DeleteIngressClasses } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteIngressClasses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ name: string }> }) => DeleteIngressClasses(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSCLASSES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSCLASS_DETAIL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESS_CLASS_YAML] });
      const count = items.length;
      renderSuccessToast({
        title: "IngressClasses deleted",
        description: `${count} ingressclass${count === 1 ? "" : "es"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete IngressClasses",
        description: `Error deleting IngressClasses: ${String(err)}`,
      }),
  });
};
