import { Divider, DonutChart, ResourceLink } from "@galacius/design-system";
import { FC, useMemo } from "react";
import { useCatchForbiddenResources } from "../../shared/hooks/async-events/useCatchForbiddenResources";
import { useMainLayoutContext } from "../MainLayoutContext";
import { RESOURCE_LABEL, ViewType } from "../navConfig";
import { EventsTable } from "./base/events/components/EventsTable";
import { useGetWarningEvents } from "./base/events/hooks/data-access/useGetWarningEvents";
import { useGetCronJobsSummary } from "./workloads/cronjobs/hooks/data-access/useGetCronJobsSummary";
import { useGetDaemonSetsSummary } from "./workloads/daemonsets/hooks/data-access/useGetDaemonSetsSummary";
import { useGetDeploymentsSummary } from "./workloads/deployments/hooks/data-access/useGetDeploymentsSummary";
import { useGetJobsSummary } from "./workloads/jobs/hooks/data-access/useGetJobsSummary";
import { useGetPodsSummary } from "./workloads/pods/hooks/data-access/useGetPodsSummary";
import { useGetReplicaSetsSummary } from "./workloads/replicasets/hooks/data-access/useGetReplicaSetsSummary";
import { useGetStatefulSetsSummary } from "./workloads/statefulsets/hooks/data-access/useGetStatefulSetsSummary";

interface OverviewViewProps {
  onNavigateToView?: (view: ViewType) => void;
}

export const OverviewView: FC<OverviewViewProps> = ({ onNavigateToView }) => {
  const { activeContext, namespaces } = useMainLayoutContext();

  useCatchForbiddenResources(
    [
      "pods",
      "deployments",
      "daemonsets",
      "statefulsets",
      "replicasets",
      "jobs",
      "cronjobs",
      "events",
    ],
    {
      labelMap: RESOURCE_LABEL,
      activeContext,
      namespaces,
    }
  );

  const {
    data: podsSummary = { Running: 0, Pending: 0, Failed: 0, Succeeded: 0, Evicted: 0 },
    isLoading: isPodsSummaryLoading,
  } = useGetPodsSummary({ context: activeContext, namespaces });
  const {
    data: deploymentsSummary = { Running: 0, Pending: 0 },
    isLoading: isDeploymentsSummaryLoading,
  } = useGetDeploymentsSummary({
    context: activeContext,
    namespaces,
  });
  const {
    data: daemonSetsSummary = { Running: 0, Pending: 0 },
    isLoading: isDaemonSetsSummaryLoading,
  } = useGetDaemonSetsSummary({
    context: activeContext,
    namespaces,
  });
  const {
    data: statefulSetsSummary = { Running: 0, Pending: 0 },
    isLoading: isStatefulSetsSummaryLoading,
  } = useGetStatefulSetsSummary({
    context: activeContext,
    namespaces,
  });
  const {
    data: replicaSetsSummary = { Running: 0, Pending: 0 },
    isLoading: isReplicaSetsSummaryLoading,
  } = useGetReplicaSetsSummary({
    context: activeContext,
    namespaces,
  });
  const {
    data: jobsSummary = { Succeeded: 0, Failed: 0, Pending: 0 },
    isLoading: isJobsSummaryLoading,
  } = useGetJobsSummary({
    context: activeContext,
    namespaces,
  });
  const {
    data: cronJobsSummary = { Scheduled: 0, Suspended: 0 },
    isLoading: isCronJobsSummaryLoading,
  } = useGetCronJobsSummary({
    context: activeContext,
    namespaces,
  });
  const { data: warningEvents = [], isLoading: isWarningEventsLoading } = useGetWarningEvents({
    context: activeContext,
    namespaces,
  });

  const totalPods = useMemo(
    () =>
      podsSummary.Running +
      podsSummary.Pending +
      podsSummary.Failed +
      podsSummary.Succeeded +
      podsSummary.Evicted,
    [podsSummary]
  );
  const totalDeployments = useMemo(
    () => deploymentsSummary.Running + deploymentsSummary.Pending,
    [deploymentsSummary]
  );
  const totalDaemonSets = useMemo(
    () => daemonSetsSummary.Running + daemonSetsSummary.Pending,
    [daemonSetsSummary]
  );
  const totalStatefulSets = useMemo(
    () => statefulSetsSummary.Running + statefulSetsSummary.Pending,
    [statefulSetsSummary]
  );
  const totalReplicaSets = useMemo(
    () => replicaSetsSummary.Running + replicaSetsSummary.Pending,
    [replicaSetsSummary]
  );
  const totalJobs = useMemo(
    () => jobsSummary.Succeeded + jobsSummary.Failed + jobsSummary.Pending,
    [jobsSummary]
  );
  const totalCronJobs = useMemo(
    () => cronJobsSummary.Scheduled + cronJobsSummary.Suspended,
    [cronJobsSummary]
  );

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap gap-8">
        <DonutChart
          label="Pods"
          total={totalPods}
          running={podsSummary.Running}
          pending={podsSummary.Pending}
          failed={podsSummary.Failed}
          items={[
            { label: "Succeeded", color: "green", count: podsSummary.Succeeded },
            { label: "Running", color: "green", count: podsSummary.Running },
            { label: "Pending", color: "amber", count: podsSummary.Pending },
            { label: "Failed", color: "red", count: podsSummary.Failed },
            { label: "Evicted", color: "red", count: podsSummary.Evicted },
          ]}
          onNavigate={() => onNavigateToView?.("pods")}
          isLoading={isPodsSummaryLoading}
        />
        <DonutChart
          label="Deployments"
          total={totalDeployments}
          running={deploymentsSummary.Running}
          pending={deploymentsSummary.Pending}
          items={[
            { label: "Running", color: "green", count: deploymentsSummary.Running },
            { label: "Pending", color: "amber", count: deploymentsSummary.Pending },
          ]}
          onNavigate={() => onNavigateToView?.("deployments")}
          isLoading={isDeploymentsSummaryLoading}
        />
        <DonutChart
          label="Daemon Sets"
          total={totalDaemonSets}
          running={daemonSetsSummary.Running}
          pending={daemonSetsSummary.Pending}
          items={[
            { label: "Running", color: "green", count: daemonSetsSummary.Running },
            { label: "Pending", color: "amber", count: daemonSetsSummary.Pending },
          ]}
          onNavigate={() => onNavigateToView?.("daemonsets")}
          isLoading={isDaemonSetsSummaryLoading}
        />
        <DonutChart
          label="Stateful Sets"
          total={totalStatefulSets}
          running={statefulSetsSummary.Running}
          pending={statefulSetsSummary.Pending}
          items={[
            { label: "Running", color: "green", count: statefulSetsSummary.Running },
            { label: "Pending", color: "amber", count: statefulSetsSummary.Pending },
          ]}
          onNavigate={() => onNavigateToView?.("statefulsets")}
          isLoading={isStatefulSetsSummaryLoading}
        />
        <DonutChart
          label="Replica Sets"
          total={totalReplicaSets}
          running={replicaSetsSummary.Running}
          pending={replicaSetsSummary.Pending}
          items={[
            { label: "Running", color: "green", count: replicaSetsSummary.Running },
            { label: "Pending", color: "amber", count: replicaSetsSummary.Pending },
          ]}
          onNavigate={() => onNavigateToView?.("replicasets")}
          isLoading={isReplicaSetsSummaryLoading}
        />
        <DonutChart
          label="Jobs"
          total={totalJobs}
          running={jobsSummary.Succeeded}
          pending={jobsSummary.Pending}
          failed={jobsSummary.Failed}
          items={[
            { label: "Succeeded", color: "green", count: jobsSummary.Succeeded },
            { label: "Failed", color: "red", count: jobsSummary.Failed },
            { label: "Pending", color: "amber", count: jobsSummary.Pending },
          ]}
          onNavigate={() => onNavigateToView?.("jobs")}
          isLoading={isJobsSummaryLoading}
        />
        <DonutChart
          label="Cron Jobs"
          total={totalCronJobs}
          running={cronJobsSummary.Scheduled}
          items={[
            { label: "Scheduled", color: "green", count: cronJobsSummary.Scheduled },
            { label: "Suspended", color: "amber", count: cronJobsSummary.Suspended },
          ]}
          onNavigate={() => onNavigateToView?.("cronjobs")}
          isLoading={isCronJobsSummaryLoading}
        />
      </div>

      <Divider />

      <div className="flex min-h-100 flex-1 flex-col gap-3">
        <span className="text-left text-sm font-medium">
          <ResourceLink onClick={() => onNavigateToView?.("events")}>
            Warning Events ({warningEvents.length})
          </ResourceLink>
        </span>
        <EventsTable events={warningEvents} isLoading={isWarningEventsLoading} />
      </div>
    </div>
  );
};
