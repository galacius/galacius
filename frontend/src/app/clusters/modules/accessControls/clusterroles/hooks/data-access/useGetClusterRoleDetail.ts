import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_CLUSTER_ROLE_DETAIL } from "../../api/api.const";
import type { ClusterRole } from "../../api/resources";
import { GetClusterRoleByName } from "../../api/resources";
import { useClusterRoleDetailUpdateEvents } from "../async-events/useClusterRoleDetailUpdateEvents";

export const useGetClusterRoleDetail = (context: string, name: string) => {
  // Scoped "clusterrole:update" pushes for this one ClusterRole — see useClusterRoleDetailUpdateEvents.
  const latestClusterRole = useClusterRoleDetailUpdateEvents(name);

  const query = useQuery<ClusterRole, Error>({
    queryKey: [QUERY_KEY_CLUSTER_ROLE_DETAIL, { context, name }],
    queryFn: () => GetClusterRoleByName(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestClusterRole) return latestClusterRole;
    return query.data;
  }, [latestClusterRole, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
