import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeletePriorityClass } from "@wailsjs/go/app/App";
import {
  QUERY_KEY_PRIORITY_CLASSES,
  QUERY_KEY_PRIORITY_CLASS_DETAIL,
  QUERY_KEY_PRIORITY_CLASS_YAML,
} from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeletePriorityClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => DeletePriorityClass(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PRIORITY_CLASSES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PRIORITY_CLASS_DETAIL, { name }] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PRIORITY_CLASS_YAML, { name }] });
      renderSuccessToast({
        title: "PriorityClass deleted",
        description: `${name} has been deleted`,
      });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete PriorityClass",
        description: `${name}: ${String(err)}`,
      }),
  });
};
