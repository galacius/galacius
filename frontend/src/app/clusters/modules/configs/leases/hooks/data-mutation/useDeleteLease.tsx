import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteLease } from "@wailsjs/go/app/App";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";
import { QUERY_KEY_LEASES } from "../../api/api.const";

export const useDeleteLease = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) =>
      DeleteLease(namespace, name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_LEASES] });
      renderSuccessToast({ title: "Lease deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({ title: "Failed to delete Lease", description: `${name}: ${String(err)}` }),
  });
};
