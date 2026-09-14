import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteServices } from "@wailsjs/go/app/App";
import { QUERY_KEY_SERVICES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteServices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteServices(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SERVICES] });
      const count = items.length;
      renderSuccessToast({
        title: "Services deleted",
        description: `${count} service${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete Services",
        description: `Error deleting Services: ${String(err)}`,
      }),
  });
};
