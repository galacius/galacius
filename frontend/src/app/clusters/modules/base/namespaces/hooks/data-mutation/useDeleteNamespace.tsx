import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteNamespace } from "@wailsjs/go/app/App";
import {
  QUERY_KEY_NAMESPACES,
  QUERY_KEY_NAMESPACE_DETAIL,
  QUERY_KEY_NAMESPACE_YAML,
} from "../../api/api.const";
import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export const useDeleteNamespace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) => DeleteNamespace(name),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NAMESPACES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NAMESPACE_DETAIL, { name }] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_NAMESPACE_YAML, { name }] });
      renderSuccessToast({ title: "Namespace deleted", description: `${name} has been deleted` });
    },
    onError: (err, { name }) =>
      renderErrorToast({
        title: "Failed to delete Namespace",
        description: `${name}: ${String(err)}`,
      }),
  });
};
