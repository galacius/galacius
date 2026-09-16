import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteIngresses } from "@wailsjs/go/app/App";
import { QUERY_KEY_INGRESSES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteIngresses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteIngresses(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_INGRESSES] });
      const count = items.length;
      renderSuccessToast({
        title: "Ingresses deleted",
        description: `${count} ingress${count === 1 ? "" : "es"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete Ingresses",
        description: `Error deleting Ingresses: ${String(err)}`,
      }),
  });
};
