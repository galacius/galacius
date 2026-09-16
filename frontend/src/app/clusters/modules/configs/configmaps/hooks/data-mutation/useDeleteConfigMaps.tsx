import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteConfigMaps } from "@wailsjs/go/app/App";
import { QUERY_KEY_CONFIGMAPS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteConfigMaps = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeleteConfigMaps(items),
    onSuccess: (_, { items }) => {
      const count = items.length;
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_CONFIGMAPS] });
      renderSuccessToast({
        title: "ConfigMaps deleted",
        description: `${count} configmap${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete ConfigMaps",
        description: `Error deleting ConfigMaps: ${String(err)}`,
      }),
  });
};
