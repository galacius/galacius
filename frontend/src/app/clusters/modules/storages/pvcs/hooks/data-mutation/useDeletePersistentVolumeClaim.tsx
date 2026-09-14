import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeletePersistentVolumeClaim } from "@wailsjs/go/app/App";
import { QUERY_KEY_PVCS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeletePersistentVolumeClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeletePersistentVolumeClaim(namespace, name),
    onSuccess: (_, { namespace, name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PVCS] });
      renderSuccessToast({
        title: "PersistentVolumeClaim deleted",
        description: `${namespace}/${name} has been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete PersistentVolumeClaim",
        description: `Error deleting PersistentVolumeClaim: ${String(err)}`,
      }),
  });
};
