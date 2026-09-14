import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteJobs } from "@wailsjs/go/app/App";
import { QUERY_KEY_JOBS } from "../../api/api.const";

export const useDeleteJobs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteJobs(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_JOBS] });
      const count = items.length;
      renderSuccessToast({
        title: "Jobs deleted",
        description: `${count} job${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete Jobs",
        description: `Error deleting Jobs: ${String(err)}`,
      }),
  });
};
