import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_SECRETS } from "../../api/api.const";
import type { Secret } from "../../api/resources";
import { ListSecrets } from "../../api/resources";
import { useSecretsUpdateEvents } from "../async-events/useSecretsUpdateEvents";

export const useGetSecrets = (
  input: { context: string; namespaces: string[] },
  callback?: UseQueryCallback<Secret[]>
) => {
  const { context, namespaces } = input;
  const latestSecrets = useSecretsUpdateEvents();

  const query = useQuery<Secret[], Error>({
    queryKey: [QUERY_KEY_SECRETS, { context, namespaces }],
    queryFn: () => ListSecrets(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Backend pre-filters both the initial fetch and every push event by the
  // active namespace selection, so no client-side filtering/merging by
  // namespace is needed here — just prefer live event data when present.
  const mergedData = useMemo(() => {
    const baseData = latestSecrets.length ? latestSecrets : query.data;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestSecrets, query.data, callback]);

  const isLoading = latestSecrets.length === 0 && query.isLoading;

  return {
    ...query,
    data: mergedData,
    isLoading,
  };
};
