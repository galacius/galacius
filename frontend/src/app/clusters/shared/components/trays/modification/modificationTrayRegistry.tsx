import { ClusterRoleBindingModificationTray } from "../../../../modules/accessControls/clusterrolebindings/components/ClusterRoleBindingModificationTray";
import { ClusterRoleModificationTray } from "../../../../modules/accessControls/clusterroles/components/ClusterRoleModificationTray";
import { RoleBindingModificationTray } from "../../../../modules/accessControls/rolebindings/components/RoleBindingModificationTray";
import { RoleModificationTray } from "../../../../modules/accessControls/roles/components/RoleModificationTray";
import { ServiceAccountModificationTray } from "../../../../modules/accessControls/serviceaccounts/components/ServiceAccountModificationTray";
import { ConfigMapModificationTray } from "../../../../modules/configs/configmaps/components/ConfigMapModificationTray";
import { HPAModificationTray } from "../../../../modules/configs/hpas/components/HPAModificationTray";
import { LeaseModificationTray } from "../../../../modules/configs/leases/components/LeaseModificationTray";
import { LimitRangeModificationTray } from "../../../../modules/configs/limitranges/components/LimitRangeModificationTray";
import { PodDisruptionBudgetModificationTray } from "../../../../modules/configs/pdbs/components/PodDisruptionBudgetModificationTray";
import { PriorityClassModificationTray } from "../../../../modules/configs/priorityclasses/components/PriorityClassModificationTray";
import { ResourceQuotaModificationTray } from "../../../../modules/configs/resourcequotas/components/ResourceQuotaModificationTray";
import { SecretModificationTray } from "../../../../modules/configs/secrets/components/SecretModificationTray";
import { ValidatingWebhookConfigModificationTray } from "../../../../modules/configs/validatingwebhookconfigs/components/ValidatingWebhookConfigModificationTray";
import { NamespaceModificationTray } from "../../../../modules/base/namespaces/components/NamespaceModificationTray";
import { EndpointModificationTray } from "../../../../modules/networks/endpoints/components/EndpointModificationTray";
import { EndpointSliceModificationTray } from "../../../../modules/networks/endpointslices/components/EndpointSliceModificationTray";
import { IngressClassModificationTray } from "../../../../modules/networks/ingressclasses/components/IngressClassModificationTray";
import { IngressModificationTray } from "../../../../modules/networks/ingresses/components/IngressModificationTray";
import { NetworkPolicyModificationTray } from "../../../../modules/networks/networkpolicies/components/NetworkPolicyModificationTray";
import { ServiceModificationTray } from "../../../../modules/networks/services/components/ServiceModificationTray";
import { NodeModificationTray } from "../../../../modules/base/nodes/components/NodeModificationTray";
import { PersistentVolumeClaimModificationTray } from "../../../../modules/storages/pvcs/components/PersistentVolumeClaimModificationTray";
import { PersistentVolumeModificationTray } from "../../../../modules/storages/pvs/components/PersistentVolumeModificationTray";
import { StorageClassModificationTray } from "../../../../modules/storages/storageclasses/components/StorageClassModificationTray";
import { CronJobModificationTray } from "../../../../modules/workloads/cronjobs/components/CronJobModificationTray";
import { DaemonSetModificationTray } from "../../../../modules/workloads/daemonsets/components/DaemonSetModificationTray";
import { DeploymentModificationTray } from "../../../../modules/workloads/deployments/components/DeploymentModificationTray";
import { JobModificationTray } from "../../../../modules/workloads/jobs/components/JobModificationTray";
import { PodModificationTray } from "../../../../modules/workloads/pods/components/PodModificationTray";
import { ReplicaSetModificationTray } from "../../../../modules/workloads/replicasets/components/ReplicaSetModificationTray";
import { StatefulSetModificationTray } from "../../../../modules/workloads/statefulsets/components/StatefulSetModificationTray";
import {
  ModificationResourceKind,
  ModificationTrayContentComponent,
} from "./ModificationTrayTypes";

// Register the content renderer for each resource kind's modification tray here.
export const MODIFICATION_TRAY_CONTENT_REGISTRY: Record<
  ModificationResourceKind,
  ModificationTrayContentComponent
> = {
  ClusterRole: ClusterRoleModificationTray,
  ClusterRoleBinding: ClusterRoleBindingModificationTray,
  ConfigMap: ConfigMapModificationTray,
  CronJob: CronJobModificationTray,
  DaemonSet: DaemonSetModificationTray,
  Deployment: DeploymentModificationTray,
  Endpoint: EndpointModificationTray,
  EndpointSlice: EndpointSliceModificationTray,
  HPA: HPAModificationTray,
  Ingress: IngressModificationTray,
  IngressClass: IngressClassModificationTray,
  Job: JobModificationTray,
  Lease: LeaseModificationTray,
  LimitRange: LimitRangeModificationTray,
  Namespace: NamespaceModificationTray,
  NetworkPolicy: NetworkPolicyModificationTray,
  Node: NodeModificationTray,
  PersistentVolume: PersistentVolumeModificationTray,
  PersistentVolumeClaim: PersistentVolumeClaimModificationTray,
  Pod: PodModificationTray,
  PodDisruptionBudget: PodDisruptionBudgetModificationTray,
  PriorityClass: PriorityClassModificationTray,
  ReplicaSet: ReplicaSetModificationTray,
  ResourceQuota: ResourceQuotaModificationTray,
  Role: RoleModificationTray,
  RoleBinding: RoleBindingModificationTray,
  Secret: SecretModificationTray,
  Service: ServiceModificationTray,
  ServiceAccount: ServiceAccountModificationTray,
  StatefulSet: StatefulSetModificationTray,
  StorageClass: StorageClassModificationTray,
  ValidatingWebhookConfig: ValidatingWebhookConfigModificationTray,
};
