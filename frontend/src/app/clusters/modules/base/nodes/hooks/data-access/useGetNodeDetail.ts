import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_NODE_DETAIL } from "../../api/api.const";
import type { Node } from "../../api/resources";
import { GetNodeByName } from "../../api/resources";
import { useNodeDetailUpdateEvents } from "../async-events/useNodeDetailUpdateEvents";

export const useGetNodeDetail = (context: string, name: string) => {
  // Scoped "node:update" pushes for this one Node — see useNodeDetailUpdateEvents.
  const latestNode = useNodeDetailUpdateEvents(name);

  const query = useQuery<Node, Error>({
    queryKey: [QUERY_KEY_NODE_DETAIL, { context, name }],
    queryFn: () => GetNodeByName(name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestNode) return latestNode;
    return query.data;
  }, [latestNode, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
