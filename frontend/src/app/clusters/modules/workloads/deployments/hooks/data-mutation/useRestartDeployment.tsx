import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RestartDeployment } from "@wailsjs/go/app/App";
import { QUERY_KEY_DEPLOYMENTS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useRestartDeployment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      RestartDeployment(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DEPLOYMENTS] });
      renderSuccessToast({
        title: "Deployment restarted",
        description: `${name} rollout restart initiated`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to restart deployment",
        description: `${name}: ${String(err)}`,
      }),
  });
};
