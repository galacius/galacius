import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteStorageClass } from "@wailsjs/go/app/App";
import {
  QUERY_KEY_STORAGE_CLASSES,
  QUERY_KEY_STORAGE_CLASS_DETAIL,
  QUERY_KEY_STORAGE_CLASS_YAML,
} from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteStorageClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => DeleteStorageClass(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STORAGE_CLASSES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STORAGE_CLASS_DETAIL, { name }] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STORAGE_CLASS_YAML, { name }] });
      renderSuccessToast({
        title: "StorageClass deleted",
        description: `${name} has been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete StorageClass",
        description: `Error deleting StorageClass: ${String(err)}`,
      }),
  });
};
