import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateJobFromCronJob } from "@wailsjs/go/app/App";
import { QUERY_KEY_JOBS } from "../../../jobs/api/api.const";

export const useCreateJobFromCronJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      CreateJobFromCronJob(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_JOBS] });
      renderSuccessToast({
        title: "Job created",
        description: `Triggered a manual run of ${name}`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to create Job",
        description: `${name}: ${String(err)}`,
      }),
  });
};
