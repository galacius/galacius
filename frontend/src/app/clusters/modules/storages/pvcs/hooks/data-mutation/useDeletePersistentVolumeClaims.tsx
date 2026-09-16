import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeletePersistentVolumeClaims } from "@wailsjs/go/app/App";
import { QUERY_KEY_PVCS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeletePersistentVolumeClaims = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ items }: { items: Array<{ namespace: string; name: string }> }) =>
      DeletePersistentVolumeClaims(items),
    onSuccess: (_, { items }) => {
      const count = items.length;
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PVCS] });
      renderSuccessToast({
        title: "PersistentVolumeClaims deleted",
        description: `${count} persistentvolumeclaim${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete PersistentVolumeClaims",
        description: `Error deleting PersistentVolumeClaims: ${String(err)}`,
      }),
  });
};
