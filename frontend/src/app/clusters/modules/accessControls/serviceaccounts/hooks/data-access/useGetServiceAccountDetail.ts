import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_SERVICE_ACCOUNT_DETAIL } from "../../api/api.const";
import type { ServiceAccount } from "../../api/resources";
import { GetServiceAccountByName } from "../../api/resources";
import { useServiceAccountDetailUpdateEvents } from "../async-events/useServiceAccountDetailUpdateEvents";

export const useGetServiceAccountDetail = (context: string, namespace: string, name: string) => {
  // Scoped "serviceaccount:update" pushes for this one ServiceAccount — see useServiceAccountDetailUpdateEvents.
  const latestServiceAccount = useServiceAccountDetailUpdateEvents(namespace, name);

  const query = useQuery<ServiceAccount, Error>({
    queryKey: [QUERY_KEY_SERVICE_ACCOUNT_DETAIL, { context, namespace, name }],
    queryFn: () => GetServiceAccountByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestServiceAccount) return latestServiceAccount;
    return query.data;
  }, [latestServiceAccount, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
