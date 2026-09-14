import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteHPAs } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_HPAS } from "../../api/api.const";

export const useDeleteHPAs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteHPAs(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HPAS] });
      const count = items.length;
      renderSuccessToast({
        title: "HPAs deleted",
        description: `${count} hpa${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete HPAs",
        description: `Error deleting HPAs: ${String(err)}`,
      }),
  });
};
