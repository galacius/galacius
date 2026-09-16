import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteCronJob } from "@wailsjs/go/app/App";
import { QUERY_KEY_CRONJOBS } from "../../api/api.const";

export const useDeleteCronJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteCronJob(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CRONJOBS] });
      renderSuccessToast({ title: "CronJob deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete CronJob",
        description: `${name}: ${String(err)}`,
      }),
  });
};
