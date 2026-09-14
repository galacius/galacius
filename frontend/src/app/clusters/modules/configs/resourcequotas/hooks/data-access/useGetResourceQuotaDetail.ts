import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEY_RESOURCE_QUOTA_DETAIL } from "../../api/api.const";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { ResourceQuotaDetail } from "../../api/resources";
import { GetResourceQuotaByName } from "../../api/resources";
import { useResourceQuotaUpdateEvents } from "../async-events/useResourceQuotaUpdateEvents";

export const useGetResourceQuotaDetail = (context: string, namespace: string, name: string) => {
  const latestResourceQuota = useResourceQuotaUpdateEvents(namespace, name);

  const query = useQuery<ResourceQuotaDetail, Error>({
    queryKey: [QUERY_KEY_RESOURCE_QUOTA_DETAIL, { context, namespace, name }],
    queryFn: () => GetResourceQuotaByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestResourceQuota) return latestResourceQuota;
    return query.data;
  }, [latestResourceQuota, query.data]);

  return { ...query, data: mergedData };
};
