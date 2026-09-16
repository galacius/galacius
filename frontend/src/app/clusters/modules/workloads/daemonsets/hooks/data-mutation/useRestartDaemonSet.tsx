import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RestartDaemonSet } from "@wailsjs/go/app/App";
import { QUERY_KEY_DAEMONSETS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useRestartDaemonSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      RestartDaemonSet(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DAEMONSETS] });
      renderSuccessToast({
        title: "DaemonSet restarted",
        description: `${name} restart initiated`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to restart DaemonSet",
        description: `${name}: ${String(err)}`,
      }),
  });
};
