import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeletePod } from "@wailsjs/go/app/App";
import { QUERY_KEY_PODS } from "../../api/api.const";

export const useDeletePod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeletePod(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PODS] });
      renderSuccessToast({ title: "Pod deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) => {
      renderErrorToast({ title: "Failed to delete Pod", description: `${name}: ${String(err)}` });
    },
  });
};
