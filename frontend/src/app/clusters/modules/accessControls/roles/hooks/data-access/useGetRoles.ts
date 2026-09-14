import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_ROLES } from "../../api/api.const";
import type { Role } from "../../api/resources";
import { ListRoles } from "../../api/resources";
import { useRolesUpdateEvents } from "../async-events/useRolesUpdateEvents";

export const useGetRoles = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<Role[]>
) => {
  const { context, namespaces } = input;
  const latestRoles = useRolesUpdateEvents();

  const query = useQuery<Role[], Error>({
    queryKey: [QUERY_KEY_ROLES, { context, namespaces }],
    queryFn: () => ListRoles(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestRoles.length ? latestRoles : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestRoles, query.data, callback]);

  const isLoading = latestRoles.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
