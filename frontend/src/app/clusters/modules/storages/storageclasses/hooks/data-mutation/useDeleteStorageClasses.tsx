import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteStorageClasses } from "@wailsjs/go/app/App";
import { QUERY_KEY_STORAGE_CLASSES } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteStorageClasses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ names }: { names: string[] }) =>
      DeleteStorageClasses(names.map((name) => ({ name }))),
    onSuccess: (_, { names }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STORAGE_CLASSES] });
      const count = names.length;
      renderSuccessToast({
        title: "StorageClasses deleted",
        description: `${count} storageclass${count === 1 ? "" : "es"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete StorageClasses",
        description: `Error deleting StorageClasses: ${String(err)}`,
      }),
  });
};
