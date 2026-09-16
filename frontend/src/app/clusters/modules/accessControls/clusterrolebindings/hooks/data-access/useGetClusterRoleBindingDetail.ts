import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_CLUSTER_ROLE_BINDING_DETAIL } from "../../api/api.const";
import type { ClusterRoleBinding } from "../../api/resources";
import { GetClusterRoleBindingByName } from "../../api/resources";
import { useClusterRoleBindingDetailUpdateEvents } from "../async-events/useClusterRoleBindingDetailUpdateEvents";

export const useGetClusterRoleBindingDetail = (context: string, name: string) => {
  // Scoped "clusterrolebinding:update" pushes for this one ClusterRoleBinding — see useClusterRoleBindingDetailUpdateEvents.
  const latestClusterRoleBinding = useClusterRoleBindingDetailUpdateEvents(name);

  const query = useQuery<ClusterRoleBinding, Error>({
    queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDING_DETAIL, { context, name }],
    queryFn: () => GetClusterRoleBindingByName(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestClusterRoleBinding) return latestClusterRoleBinding;
    return query.data;
  }, [latestClusterRoleBinding, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
