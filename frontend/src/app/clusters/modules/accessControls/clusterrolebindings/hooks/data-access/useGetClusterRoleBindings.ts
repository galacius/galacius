import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_CLUSTER_ROLE_BINDINGS } from "../../api/api.const";
import type { ClusterRoleBinding } from "../../api/resources";
import { ListClusterRoleBindings } from "../../api/resources";
import { useClusterRoleBindingsUpdateEvents } from "../async-events/useClusterRoleBindingsUpdateEvents";

export const useGetClusterRoleBindings = (
  context: string,
  callback?: UseQueryCallback<ClusterRoleBinding[]>
) => {
  const latestClusterRoleBindings = useClusterRoleBindingsUpdateEvents();
  const query = useQuery<ClusterRoleBinding[], Error>({
    queryKey: [QUERY_KEY_CLUSTER_ROLE_BINDINGS, context],
    queryFn: () => ListClusterRoleBindings(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  const mergedData = useMemo(() => {
    let baseData = query.data;
    if (latestClusterRoleBindings.length) baseData = latestClusterRoleBindings;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestClusterRoleBindings, query.data, callback]);

  return { ...query, data: mergedData };
};
