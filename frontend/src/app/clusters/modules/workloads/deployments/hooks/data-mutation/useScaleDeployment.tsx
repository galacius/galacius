import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScaleDeployment } from "@wailsjs/go/app/App";
import { QUERY_KEY_DEPLOYMENTS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useScaleDeployment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      namespace,
      name,
      replicas,
    }: {
      namespace: string;
      name: string;
      replicas: number;
    }) => ScaleDeployment(namespace, name, replicas),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DEPLOYMENTS] });
      renderSuccessToast({
        title: "Deployment scaled",
        description: `${name} scaled successfully`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to scale deployment",
        description: `${name}: ${String(err)}`,
      }),
  });
};
