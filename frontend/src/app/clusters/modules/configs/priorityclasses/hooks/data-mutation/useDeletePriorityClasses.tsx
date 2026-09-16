import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeletePriorityClasses } from "@wailsjs/go/app/App";
import { QUERY_KEY_PRIORITY_CLASSES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeletePriorityClasses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ name: string }> }) => DeletePriorityClasses(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PRIORITY_CLASSES] });
      const count = items.length;
      renderSuccessToast({
        title: "PriorityClasses deleted",
        description: `${count} priorityclass${count === 1 ? "" : "es"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete PriorityClasses",
        description: `Error deleting PriorityClasses: ${String(err)}`,
      }),
  });
};
