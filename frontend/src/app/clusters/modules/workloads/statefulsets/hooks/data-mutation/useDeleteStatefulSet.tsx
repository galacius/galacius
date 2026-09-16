import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteStatefulSet } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_STATEFULSETS } from "../../api/api.const";

export const useDeleteStatefulSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteStatefulSet(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATEFULSETS] });
      renderSuccessToast({ title: "StatefulSet deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete StatefulSet",
        description: `${name}: ${String(err)}`,
      }),
  });
};
