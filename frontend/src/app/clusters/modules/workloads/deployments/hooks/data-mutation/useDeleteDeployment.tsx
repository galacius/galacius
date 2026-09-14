import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteDeployment } from "@wailsjs/go/app/App";
import { QUERY_KEY_DEPLOYMENTS } from "../../api/api.const";

export const useDeleteDeployment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteDeployment(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DEPLOYMENTS] });
      renderSuccessToast({ title: "Deployment deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete Deployment",
        description: `${name}: ${String(err)}`,
      }),
  });
};
