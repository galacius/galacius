import { LoadingSpinner } from "@galacius/design-system";
import { FC, lazy, Suspense } from "react";
import { useDetailDrawerContext } from "./DetailDrawerContext";

const PodDetailDrawer = lazy(() =>
  import("../../../modules/workloads/pods/components/PodDetailDrawer").then((m) => ({
    default: m.PodDetailDrawer,
  }))
);
const JobDetailDrawer = lazy(() =>
  import("../../../modules/workloads/jobs/components/JobDetailDrawer").then((m) => ({
    default: m.JobDetailDrawer,
  }))
);
const CronJobDetailDrawer = lazy(() =>
  import("../../../modules/workloads/cronjobs/components/CronJobDetailDrawer").then((m) => ({
    default: m.CronJobDetailDrawer,
  }))
);
const DeploymentDetailDrawer = lazy(() =>
  import("../../../modules/workloads/deployments/components/DeploymentDetailDrawer").then((m) => ({
    default: m.DeploymentDetailDrawer,
  }))
);
const ReplicaSetDetailDrawer = lazy(() =>
  import("../../../modules/workloads/replicasets/components/ReplicaSetDetailDrawer").then((m) => ({
    default: m.ReplicaSetDetailDrawer,
  }))
);
const DaemonSetDetailDrawer = lazy(() =>
  import("../../../modules/workloads/daemonsets/components/DaemonSetDetailDrawer").then((m) => ({
    default: m.DaemonSetDetailDrawer,
  }))
);
const StatefulSetDetailDrawer = lazy(() =>
  import("../../../modules/workloads/statefulsets/components/StatefulSetDetailDrawer").then(
    (m) => ({
      default: m.StatefulSetDetailDrawer,
    })
  )
);
const HPADetailDrawer = lazy(() =>
  import("../../../modules/configs/hpas/components/HPADetailDrawer").then((m) => ({
    default: m.HPADetailDrawer,
  }))
);
const PodDisruptionBudgetDetailDrawer = lazy(() =>
  import("../../../modules/configs/pdbs/components/PodDisruptionBudgetDetailDrawer").then((m) => ({
    default: m.PodDisruptionBudgetDetailDrawer,
  }))
);

export const WorkloadDetailDrawers: FC<{ onNavigateToPortForwarding: () => void }> = ({
  onNavigateToPortForwarding,
}) => {
  const {
    selectedPodName,
    selectedPodNamespace,
    onTogglePodDetail,

    selectedJobName,
    selectedJobNamespace,
    onToggleJobDetail,

    selectedCronJobName,
    selectedCronJobNamespace,
    onToggleCronJobDetail,

    selectedDeploymentName,
    selectedDeploymentNamespace,
    onToggleDeploymentDetail,

    selectedReplicaSetName,
    selectedReplicaSetNamespace,
    onToggleReplicaSetDetail,

    selectedDaemonSetName,
    selectedDaemonSetNamespace,
    onToggleDaemonSetDetail,

    selectedStatefulSetName,
    selectedStatefulSetNamespace,
    onToggleStatefulSetDetail,

    selectedHPAName,
    selectedHPANamespace,
    onToggleHPADetail,

    selectedPodDisruptionBudgetName,
    selectedPodDisruptionBudgetNamespace,
    onTogglePodDisruptionBudgetDetail,
  } = useDetailDrawerContext((v) => ({
    selectedPodName: v.selectedPodName,
    selectedPodNamespace: v.selectedPodNamespace,
    onTogglePodDetail: v.onTogglePodDetail,

    selectedJobName: v.selectedJobName,
    selectedJobNamespace: v.selectedJobNamespace,
    onToggleJobDetail: v.onToggleJobDetail,

    selectedCronJobName: v.selectedCronJobName,
    selectedCronJobNamespace: v.selectedCronJobNamespace,
    onToggleCronJobDetail: v.onToggleCronJobDetail,

    selectedDeploymentName: v.selectedDeploymentName,
    selectedDeploymentNamespace: v.selectedDeploymentNamespace,
    onToggleDeploymentDetail: v.onToggleDeploymentDetail,

    selectedReplicaSetName: v.selectedReplicaSetName,
    selectedReplicaSetNamespace: v.selectedReplicaSetNamespace,
    onToggleReplicaSetDetail: v.onToggleReplicaSetDetail,

    selectedDaemonSetName: v.selectedDaemonSetName,
    selectedDaemonSetNamespace: v.selectedDaemonSetNamespace,
    onToggleDaemonSetDetail: v.onToggleDaemonSetDetail,

    selectedStatefulSetName: v.selectedStatefulSetName,
    selectedStatefulSetNamespace: v.selectedStatefulSetNamespace,
    onToggleStatefulSetDetail: v.onToggleStatefulSetDetail,

    selectedHPAName: v.selectedHPAName,
    selectedHPANamespace: v.selectedHPANamespace,
    onToggleHPADetail: v.onToggleHPADetail,

    selectedPodDisruptionBudgetName: v.selectedPodDisruptionBudgetName,
    selectedPodDisruptionBudgetNamespace: v.selectedPodDisruptionBudgetNamespace,
    onTogglePodDisruptionBudgetDetail: v.onTogglePodDisruptionBudgetDetail,
  }));

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        <PodDetailDrawer
          podName={selectedPodName}
          podNamespace={selectedPodNamespace}
          open={!!selectedPodName}
          onClose={onTogglePodDetail}
          onNavigateToPortForwarding={() => {
            onNavigateToPortForwarding();
            onTogglePodDetail();
          }}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <JobDetailDrawer
          jobName={selectedJobName}
          jobNamespace={selectedJobNamespace}
          open={!!selectedJobName}
          onClose={onToggleJobDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <CronJobDetailDrawer
          cronJobName={selectedCronJobName}
          cronJobNamespace={selectedCronJobNamespace}
          open={!!selectedCronJobName && !!selectedCronJobNamespace}
          onClose={onToggleCronJobDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <DeploymentDetailDrawer
          deploymentName={selectedDeploymentName}
          deploymentNamespace={selectedDeploymentNamespace}
          open={!!selectedDeploymentName}
          onClose={onToggleDeploymentDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <ReplicaSetDetailDrawer
          rsName={selectedReplicaSetName}
          rsNamespace={selectedReplicaSetNamespace}
          open={!!selectedReplicaSetName}
          onClose={onToggleReplicaSetDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <DaemonSetDetailDrawer
          dsName={selectedDaemonSetName}
          dsNamespace={selectedDaemonSetNamespace}
          open={!!selectedDaemonSetName}
          onClose={onToggleDaemonSetDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <StatefulSetDetailDrawer
          statefulSetName={selectedStatefulSetName}
          statefulSetNamespace={selectedStatefulSetNamespace}
          open={!!selectedStatefulSetName}
          onClose={onToggleStatefulSetDetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <HPADetailDrawer
          hpaName={selectedHPAName}
          hpaNamespace={selectedHPANamespace}
          open={!!selectedHPAName && !!selectedHPANamespace}
          onClose={onToggleHPADetail}
        />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <PodDisruptionBudgetDetailDrawer
          pdbName={selectedPodDisruptionBudgetName}
          pdbNamespace={selectedPodDisruptionBudgetNamespace}
          open={!!selectedPodDisruptionBudgetName && !!selectedPodDisruptionBudgetNamespace}
          onClose={onTogglePodDisruptionBudgetDetail}
        />
      </Suspense>
    </>
  );
};
