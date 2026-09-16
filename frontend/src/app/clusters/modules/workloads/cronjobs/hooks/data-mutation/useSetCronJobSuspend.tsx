import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SetCronJobSuspend } from "@wailsjs/go/app/App";
import { QUERY_KEY_CRONJOBS } from "../../api/api.const";

export const useSetCronJobSuspend = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      namespace,
      name,
      suspend,
    }: {
      namespace: string;
      name: string;
      suspend: boolean;
    }) => SetCronJobSuspend(namespace, name, suspend),
    onSuccess: (_, { name, suspend }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CRONJOBS] });
      renderSuccessToast({
        title: suspend ? "CronJob suspended" : "CronJob resumed",
        description: `${name} has been ${suspend ? "suspended" : "resumed"}`,
      });
    },
    onError: (err, { name, suspend }) =>
      renderErrorToast({
        title: suspend ? "Failed to suspend CronJob" : "Failed to resume CronJob",
        description: `${name}: ${String(err)}`,
      }),
  });
};
