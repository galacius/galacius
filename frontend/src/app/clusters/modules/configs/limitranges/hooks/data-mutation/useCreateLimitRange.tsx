import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateLimitRange } from "@wailsjs/go/app/App";
import { QUERY_KEY_LIMIT_RANGES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useCreateLimitRange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      namespace,
      name,
      limits,
    }: {
      namespace: string;
      name: string;
      limits: Record<string, Record<string, string>>;
    }) => CreateLimitRange(namespace, name, limits),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LIMIT_RANGES] });
      renderSuccessToast({
        title: "LimitRange created",
        description: `${name} created successfully`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to create LimitRange",
        description: `${name}: ${String(err)}`,
      }),
  });
};
