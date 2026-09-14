import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import type { UseQueryCallback } from "@galacius/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { QUERY_KEY_NODES } from "../../api/api.const";
import type { Node } from "../../api/resources";
import { ListNodes } from "../../api/resources";
import { useNodesUpdateEvents } from "../async-events/useNodesUpdateEvents";

export const useGetNodes = (context: string, callback?: UseQueryCallback<Node[]>) => {
  const latestNodes = useNodesUpdateEvents();

  const query = useQuery<Node[], Error>({
    queryKey: [QUERY_KEY_NODES, context],
    queryFn: () => ListNodes(),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context,
  });

  // Merge event-driven data locally: prefer event nodes over fetched data if available.
  const mergedData = useMemo(() => {
    let baseData = query.data;
    if (latestNodes.length) baseData = latestNodes;
    return callback?.select ? callback.select(baseData) : baseData;
  }, [latestNodes, query.data, callback]);

  return {
    ...query,
    data: mergedData,
  };
};
