import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeletePersistentVolumes } from "@wailsjs/go/app/App";
import { QUERY_KEY_PVS } from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeletePersistentVolumes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ names }: { names: string[] }) =>
      DeletePersistentVolumes(names.map((name) => ({ name }))),
    onSuccess: (_, { names }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_PVS] });
      const count = names.length;
      renderSuccessToast({
        title: "PersistentVolumes deleted",
        description: `${count} persistentvolume${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} been deleted`,
      });
    },
    onError: (err) =>
      renderErrorToast({
        title: "Failed to delete PersistentVolumes",
        description: `Error deleting PersistentVolumes: ${String(err)}`,
      }),
  });
};
