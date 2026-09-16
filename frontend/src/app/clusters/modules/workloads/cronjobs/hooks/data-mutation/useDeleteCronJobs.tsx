import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteCronJobs } from "@wailsjs/go/app/App";
import { QUERY_KEY_CRONJOBS } from "../../api/api.const";

export const useDeleteCronJobs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteCronJobs(items),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CRONJOBS] });
      const count = items.length;
      renderSuccessToast({
        title: "CronJobs deleted",
        description: `${count} cronjob${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete CronJobs",
        description: `Error deleting CronJobs: ${String(err)}`,
      }),
  });
};
