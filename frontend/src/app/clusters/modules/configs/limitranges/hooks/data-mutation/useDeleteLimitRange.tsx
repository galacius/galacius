import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteLimitRange } from "@wailsjs/go/app/App";
import { QUERY_KEY_LIMIT_RANGES } from "../../api/api.const";

export const useDeleteLimitRange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteLimitRange(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LIMIT_RANGES] });
      renderSuccessToast({ title: "LimitRange deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete LimitRange",
        description: `${name}: ${String(err)}`,
      }),
  });
};
