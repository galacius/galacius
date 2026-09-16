import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteHPA } from "@wailsjs/go/app/App";
import { QUERY_KEY_HPAS } from "../../api/api.const";

export const useDeleteHPA = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteHPA(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HPAS] });
      renderSuccessToast({ title: "HPA deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({ title: "Failed to delete HPA", description: `${name}: ${String(err)}` }),
  });
};
