import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_QUERY_OPTIONS } from "../../../../../../shared/api/api";
import { QUERY_KEY_DEPLOYMENT_DETAIL } from "../../api/api.const";
import type { Deployment } from "../../api/resources";
import { GetDeploymentByName } from "../../api/resources";
import { useDeploymentDetailUpdateEvents } from "../async-events/useDeploymentDetailUpdateEvents";

export const useGetDeploymentDetail = (context: string, namespace: string, name: string) => {
  // Scoped "deployment:update" pushes for this one Deployment — see useDeploymentDetailUpdateEvents.
  const latestDeployment = useDeploymentDetailUpdateEvents(namespace, name);

  const query = useQuery<Deployment, Error>({
    queryKey: [QUERY_KEY_DEPLOYMENT_DETAIL, { context, namespace, name }],
    queryFn: () => GetDeploymentByName(namespace, name),
    ...DEFAULT_QUERY_OPTIONS,
    enabled: !!context && !!namespace && !!name,
  });

  const mergedData = useMemo(() => {
    if (latestDeployment) return latestDeployment;
    return query.data;
  }, [latestDeployment, query.data]);

  return {
    ...query,
    data: mergedData,
  };
};
