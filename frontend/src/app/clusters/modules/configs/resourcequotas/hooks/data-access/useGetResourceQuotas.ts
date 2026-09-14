import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_RESOURCE_QUOTAS } from "../../api/api.const";
import type { ResourceQuota } from "../../api/resources";
import { ListResourceQuotas } from "../../api/resources";
import { useResourceQuotasUpdateEvents } from "../async-events/useResourceQuotasUpdateEvents";

export const useGetResourceQuotas = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<ResourceQuota[]>
) => {
  const { context, namespaces } = input;
  const latestResourceQuotas = useResourceQuotasUpdateEvents();

  const query = useQuery<ResourceQuota[], Error>({
    queryKey: [QUERY_KEY_RESOURCE_QUOTAS, { context, namespaces }],
    queryFn: () => ListResourceQuotas(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestResourceQuotas.length ? latestResourceQuotas : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestResourceQuotas, query.data, callback]);

  const isLoading = latestResourceQuotas.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
