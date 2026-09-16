import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteIngress } from "@wailsjs/go/app/App";
import { QUERY_KEY_INGRESSES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteIngress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteIngress(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSES] });
      renderSuccessToast({ title: "Ingress deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete Ingress",
        description: `${name}: ${String(err)}`,
      }),
  });
};
