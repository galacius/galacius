import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteJob } from "@wailsjs/go/app/App";
import { QUERY_KEY_JOBS } from "../../api/api.const";

export const useDeleteJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteJob(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_JOBS] });
      renderSuccessToast({ title: "Job deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({ title: "Failed to delete Job", description: `${name}: ${String(err)}` }),
  });
};
