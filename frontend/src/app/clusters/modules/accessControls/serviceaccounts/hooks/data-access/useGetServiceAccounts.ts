import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_SERVICE_ACCOUNTS } from "../../api/api.const";
import type { ServiceAccount } from "../../api/resources";
import { ListServiceAccounts } from "../../api/resources";
import { useServiceAccountsUpdateEvents } from "../async-events/useServiceAccountsUpdateEvents";

export const useGetServiceAccounts = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<ServiceAccount[]>
) => {
  const { context, namespaces } = input;
  const latestServiceAccounts = useServiceAccountsUpdateEvents();

  const query = useQuery<ServiceAccount[], Error>({
    queryKey: [QUERY_KEY_SERVICE_ACCOUNTS, { context, namespaces }],
    queryFn: () => ListServiceAccounts(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestServiceAccounts.length ? latestServiceAccounts : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestServiceAccounts, query.data, callback]);

  const isLoading = latestServiceAccounts.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
