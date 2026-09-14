import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_CLUSTER_ROLES } from "../../api/api.const";
import type { ClusterRole } from "../../api/resources";
import { ListClusterRoles } from "../../api/resources";
import { useClusterRolesUpdateEvents } from "../async-events/useClusterRolesUpdateEvents";

export const useGetClusterRoles = (context: string, callback?: UseQueryCallback<ClusterRole[]>) => {
  const latestClusterRoles = useClusterRolesUpdateEvents();
  const query = useQuery<ClusterRole[], Error>({
    queryKey: [QUERY_KEY_CLUSTER_ROLES, context],
    queryFn: () => ListClusterRoles(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  const mergedData = useMemo(() => {
    let baseData = query.data;
    if (latestClusterRoles.length) baseData = latestClusterRoles;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestClusterRoles, query.data, callback]);

  return { ...query, data: mergedData };
};
