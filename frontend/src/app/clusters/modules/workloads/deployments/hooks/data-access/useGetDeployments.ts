import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_DEPLOYMENTS } from "../../api/api.const";
import type { Deployment } from "../../api/resources";
import { ListDeployments } from "../../api/resources";
import { useDeploymentsUpdateEvents } from "../async-events/useDeploymentsUpdateEvents";

export const useGetDeployments = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<Deployment[]>
) => {
  const { context, namespaces } = input;
  const latestDeployments = useDeploymentsUpdateEvents();

  const query = useQuery<Deployment[], Error>({
    queryKey: [QUERY_KEY_DEPLOYMENTS, { context, namespaces }],
    queryFn: () => ListDeployments(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestDeployments.length ? latestDeployments : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestDeployments, query.data, callback]);

  const isLoading = latestDeployments.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
