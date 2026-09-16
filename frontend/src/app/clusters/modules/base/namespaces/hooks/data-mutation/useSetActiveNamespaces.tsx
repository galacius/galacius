import { renderErrorToast } from "@galacius/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SetActiveNamespaces } from "../../api/resources";

// Module-scoped (not per-hook-instance) so every call site shares one
// monotonic counter — there's only one logical "active namespaces" value on
// the backend to order calls against.
let callSeq = 0;

export const useSetActiveNamespaces = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // Two rapid selection changes each fire their own untracked, unordered
    // mutate() call; the Wails IPC bridge gives no guarantee the backend
    // receives them in the order they were issued here. Incrementing seq
    // synchronously (before the async IPC call) lets the backend detect and
    // drop a call that arrives after a call with a higher seq — i.e. an
    // earlier selection arriving late can no longer silently overwrite a
    // newer one. See App.SetActiveNamespaces.
    mutationFn: (namespaces: string[]) => SetActiveNamespaces(namespaces, ++callSeq),
    // The caller flips local `namespaces` state (part of every list query's
    // key) in lockstep with this call, so most queries re-fetch under a new
    // key immediately — before the backend's active-namespace state is
    // actually updated. That in-flight fetch can land under the new key with
    // data still filtered by the OLD selection. Invalidating every
    // namespace-scoped query once the backend confirms the change forces a
    // re-fetch against the now-correct backend state, closing that race.
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.some((k) => typeof k === "object" && k !== null && "namespaces" in k),
      }),
    onError: (err) =>
      renderErrorToast({
        title: "Failed to set active namespaces",
        description: String(err),
      }),
  });
};
