import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteDaemonSet } from "@wailsjs/go/app/App";
import { QUERY_KEY_DAEMONSETS } from "../../api/api.const";

export const useDeleteDaemonSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteDaemonSet(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_DAEMONSETS] });
      renderSuccessToast({ title: "DaemonSet deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete DaemonSet",
        description: `${name}: ${String(err)}`,
      }),
  });
};
