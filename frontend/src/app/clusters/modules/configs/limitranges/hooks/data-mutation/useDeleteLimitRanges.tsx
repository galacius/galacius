import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteLimitRanges } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_LIMIT_RANGES } from "../../api/api.const";

export const useDeleteLimitRanges = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ lrNamespace: string; lrName: string }> }) =>
      DeleteLimitRanges(items.map((item) => ({ namespace: item.lrNamespace, name: item.lrName }))),
    onSuccess: (_, { items }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LIMIT_RANGES] });
      const count = items.length;
      renderSuccessToast({
        title: "LimitRanges deleted",
        description: `${count} limitrange${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete LimitRanges",
        description: `Error deleting LimitRanges: ${String(err)}`,
      }),
  });
};
