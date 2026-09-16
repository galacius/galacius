import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_ROLE_BINDINGS } from "../../api/api.const";
import type { RoleBinding } from "../../api/resources";
import { ListRoleBindings } from "../../api/resources";
import { useRoleBindingsUpdateEvents } from "../async-events/useRoleBindingsUpdateEvents";

export const useGetRoleBindings = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<RoleBinding[]>
) => {
  const { context, namespaces } = input;
  const latestRoleBindings = useRoleBindingsUpdateEvents();

  const query = useQuery<RoleBinding[], Error>({
    queryKey: [QUERY_KEY_ROLE_BINDINGS, { context, namespaces }],
    queryFn: () => ListRoleBindings(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestRoleBindings.length ? latestRoleBindings : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestRoleBindings, query.data, callback]);

  const isLoading = latestRoleBindings.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
