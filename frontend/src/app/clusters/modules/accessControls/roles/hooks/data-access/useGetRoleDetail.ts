import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_ROLE_DETAIL } from "../../api/api.const";
import type { Role } from "../../api/resources";
import { GetRoleByName } from "../../api/resources";
import { useRoleDetailUpdateEvents } from "../async-events/useRoleDetailUpdateEvents";

export const useGetRoleDetail = (context: string, namespace: string, name: string) => {
  // Scoped "role:update" pushes for this one Role — see useRoleDetailUpdateEvents.
  const latestRole = useRoleDetailUpdateEvents(namespace, name);

  const query = useQuery<Role, Error>({
    queryKey: [QUERY_KEY_ROLE_DETAIL, { context, namespace, name }],
    queryFn: () => GetRoleByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestRole) return latestRole;
    return query.data;
  }, [latestRole, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
