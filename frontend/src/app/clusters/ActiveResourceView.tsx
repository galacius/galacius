import { FC, lazy, ReactNode } from "react";
import { CoreViewType, ViewType } from "./navConfig";

const PodsView = lazy(() =>
  import("./modules/workloads/pods/PodsView").then((m) => ({
    default: m.PodsView,
  }))
);
const DeploymentsView = lazy(() =>
  import("./modules/workloads/deployments/DeploymentsView").then((m) => ({
    default: m.DeploymentsView,
  }))
);
const ServicesView = lazy(() =>
  import("./modules/networks/services/ServicesView").then((m) => ({
    default: m.ServicesView,
  }))
);
const NodesView = lazy(() =>
  import("./modules/base/nodes/NodesView").then((m) => ({
    default: m.NodesView,
  }))
);
const NamespacesView = lazy(() =>
  import("./modules/base/namespaces/NamespacesView").then((m) => ({
    default: m.NamespacesView,
  }))
);
const DaemonSetsView = lazy(() =>
  import("./modules/workloads/daemonsets/DaemonSetsView").then((m) => ({
    default: m.DaemonSetsView,
  }))
);
const ReplicaSetsView = lazy(() =>
  import("./modules/workloads/replicasets/ReplicaSetsView").then((m) => ({
    default: m.ReplicaSetsView,
  }))
);
const ConfigMapsView = lazy(() =>
  import("./modules/configs/configmaps/ConfigMapsView").then((m) => ({
    default: m.ConfigMapsView,
  }))
);
const EndpointSlicesView = lazy(() =>
  import("./modules/networks/endpointslices/EndpointSlicesView").then((m) => ({
    default: m.EndpointSlicesView,
  }))
);
const EndpointsView = lazy(() =>
  import("./modules/networks/endpoints/EndpointsView").then((m) => ({
    default: m.EndpointsView,
  }))
);
const StatefulSetsView = lazy(() =>
  import("./modules/workloads/statefulsets/StatefulSetsView").then((m) => ({
    default: m.StatefulSetsView,
  }))
);
const JobsView = lazy(() =>
  import("./modules/workloads/jobs/JobsView").then((m) => ({
    default: m.JobsView,
  }))
);
const CronJobsView = lazy(() =>
  import("./modules/workloads/cronjobs/CronJobsView").then((m) => ({
    default: m.CronJobsView,
  }))
);
const SecretsView = lazy(() =>
  import("./modules/configs/secrets/SecretsView").then((m) => ({
    default: m.SecretsView,
  }))
);
const ResourceQuotasView = lazy(() =>
  import("./modules/configs/resourcequotas/ResourceQuotasView").then((m) => ({
    default: m.ResourceQuotasView,
  }))
);
const LimitRangesView = lazy(() =>
  import("./modules/configs/limitranges/LimitRangesView").then((m) => ({
    default: m.LimitRangesView,
  }))
);
const HPAView = lazy(() =>
  import("./modules/configs/hpas/HPAView").then((m) => ({
    default: m.HPAView,
  }))
);
const PodDisruptionBudgetsView = lazy(() =>
  import("./modules/configs/pdbs/PodDisruptionBudgetsView").then((m) => ({
    default: m.PodDisruptionBudgetsView,
  }))
);
const ValidatingWebhookConfigsView = lazy(() =>
  import("./modules/configs/validatingwebhookconfigs/ValidatingWebhookConfigsView").then((m) => ({
    default: m.ValidatingWebhookConfigsView,
  }))
);
const IngressesView = lazy(() =>
  import("./modules/networks/ingresses/IngressesView").then((m) => ({
    default: m.IngressesView,
  }))
);
const IngressClassesView = lazy(() =>
  import("./modules/networks/ingressclasses/IngressClassesView").then((m) => ({
    default: m.IngressClassesView,
  }))
);
const NetworkPoliciesView = lazy(() =>
  import("./modules/networks/networkpolicies/NetworkPoliciesView").then((m) => ({
    default: m.NetworkPoliciesView,
  }))
);
const PortForwardingView = lazy(() =>
  import("./modules/networks/portforwarding/PortForwardingView").then((m) => ({
    default: m.PortForwardingView,
  }))
);
const PersistentVolumeClaimsView = lazy(() =>
  import("./modules/storages/pvcs/PersistentVolumeClaimsView").then((m) => ({
    default: m.PersistentVolumeClaimsView,
  }))
);
const PersistentVolumesView = lazy(() =>
  import("./modules/storages/pvs/PersistentVolumesView").then((m) => ({
    default: m.PersistentVolumesView,
  }))
);
const ServiceAccountsView = lazy(() =>
  import("./modules/accessControls/serviceaccounts/ServiceAccountsView").then((m) => ({
    default: m.ServiceAccountsView,
  }))
);
const ClusterRolesView = lazy(() =>
  import("./modules/accessControls/clusterroles/ClusterRolesView").then((m) => ({
    default: m.ClusterRolesView,
  }))
);
const RolesView = lazy(() =>
  import("./modules/accessControls/roles/RolesView").then((m) => ({
    default: m.RolesView,
  }))
);
const ClusterRoleBindingsView = lazy(() =>
  import("./modules/accessControls/clusterrolebindings/ClusterRoleBindingsView").then((m) => ({
    default: m.ClusterRoleBindingsView,
  }))
);
const RoleBindingsView = lazy(() =>
  import("./modules/accessControls/rolebindings/RoleBindingsView").then((m) => ({
    default: m.RoleBindingsView,
  }))
);
const StorageClassesView = lazy(() =>
  import("./modules/storages/storageclasses/StorageClassesView").then((m) => ({
    default: m.StorageClassesView,
  }))
);
const EventsView = lazy(() =>
  import("./modules/base/events/EventsView").then((m) => ({
    default: m.EventsView,
  }))
);
const PriorityClassesView = lazy(() =>
  import("./modules/configs/priorityclasses/PriorityClassesView").then((m) => ({
    default: m.PriorityClassesView,
  }))
);
const LeasesView = lazy(() =>
  import("./modules/configs/leases/LeasesView").then((m) => ({
    default: m.LeasesView,
  }))
);
const OverviewView = lazy(() =>
  import("./modules/OverviewView").then((m) => ({
    default: m.OverviewView,
  }))
);

interface ActiveResourceViewProps {
  activeResource: ViewType;
  activeContext: string;
  onNavigateToView: (view: ViewType) => void;
}

type ViewRenderer = (props: ActiveResourceViewProps) => ReactNode;

// One entry per built-in resource view. A lookup table (rather than a chain of
// `activeResource === "x" && <XView />` checks) keeps this a plain data
// dispatch instead of a giant branch, since the views are mutually exclusive
// alternatives selected by a single discriminant, not independent conditions.
const VIEW_RENDERERS: Record<CoreViewType, ViewRenderer> = {
  overview: ({ onNavigateToView }) => <OverviewView onNavigateToView={onNavigateToView} />,
  pods: () => <PodsView />,
  deployments: () => <DeploymentsView />,
  daemonsets: () => <DaemonSetsView />,
  statefulsets: () => <StatefulSetsView />,
  jobs: () => <JobsView />,
  cronjobs: () => <CronJobsView />,
  replicasets: () => <ReplicaSetsView />,
  configmaps: () => <ConfigMapsView />,
  secrets: () => <SecretsView />,
  resourcequotas: () => <ResourceQuotasView />,
  limitranges: () => <LimitRangesView />,
  hpa: () => <HPAView />,
  pdbs: () => <PodDisruptionBudgetsView />,
  validatingwebhookconfigs: () => <ValidatingWebhookConfigsView />,
  ingresses: () => <IngressesView />,
  ingressclasses: () => <IngressClassesView />,
  networkpolicies: () => <NetworkPoliciesView />,
  portforwarding: () => <PortForwardingView />,
  pvcs: () => <PersistentVolumeClaimsView />,
  pvs: () => <PersistentVolumesView />,
  storageclasses: () => <StorageClassesView />,
  endpointslices: () => <EndpointSlicesView />,
  endpoints: () => <EndpointsView />,
  services: () => <ServicesView />,
  nodes: () => <NodesView />,
  namespaces: () => <NamespacesView />,
  serviceaccounts: () => <ServiceAccountsView />,
  clusterroles: () => <ClusterRolesView />,
  roles: () => <RolesView />,
  clusterrolebindings: () => <ClusterRoleBindingsView />,
  rolebindings: () => <RoleBindingsView />,
  priorityclasses: ({ activeContext }) => <PriorityClassesView key={activeContext} />,
  leases: () => <LeasesView />,
  events: () => <EventsView />,
};

export const ActiveResourceView: FC<ActiveResourceViewProps> = (props) => {
  const render = VIEW_RENDERERS[props.activeResource as CoreViewType];
  return render ? render(props) : null;
};
