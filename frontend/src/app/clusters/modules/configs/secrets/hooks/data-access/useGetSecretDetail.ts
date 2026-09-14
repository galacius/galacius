import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_SECRET_DETAIL } from "../../api/api.const";
import type { SecretDetail } from "../../api/resources";
import { GetSecretByName } from "../../api/resources";
import { useSecretUpdateEvents } from "../async-events/useSecretUpdateEvents";

export const useGetSecretDetail = (context: string, namespace: string, name: string) => {
  const latestSecret = useSecretUpdateEvents(namespace, name);

  const query = useQuery<SecretDetail, Error>({
    queryKey: [QUERY_KEY_SECRET_DETAIL, { context, namespace, name }],
    queryFn: () => GetSecretByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestSecret) return latestSecret;
    return query.data;
  }, [latestSecret, query.data]);

  return { ...query, data: mergedData };
};
