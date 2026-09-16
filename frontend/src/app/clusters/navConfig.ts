import { NavEntry } from "@galacius/core";
import {
  BoxesIcon,
  ClockIcon,
  HardDriveIcon,
  LayersIcon,
  LayoutDashboardIcon,
  NetworkIcon,
  ServerIcon,
  Settings2Icon,
  ShieldIcon,
} from "@galacius/design-system";

export type CoreViewType =
  | "pods"
  | "deployments"
  | "daemonsets"
  | "statefulsets"
  | "replicasets"
  | "jobs"
  | "cronjobs"
  | "configmaps"
  | "secrets"
  | "resourcequotas"
  | "limitranges"
  | "hpa"
  | "pdbs"
  | "validatingwebhookconfigs"
  | "ingresses"
  | "ingressclasses"
  | "networkpolicies"
  | "portforwarding"
  | "pvcs"
  | "pvs"
  | "storageclasses"
  | "serviceaccounts"
  | "clusterroles"
  | "roles"
  | "clusterrolebindings"
  | "rolebindings"
  | "endpoints"
  | "endpointslices"
  | "services"
  | "nodes"
  | "namespaces"
  | "events"
  | "priorityclasses"
  | "leases"
  | "overview";

export type ViewType = CoreViewType | string;

export const NAV_CORE: NavEntry<CoreViewType>[] = [
  {
    kind: "item",
    icon: LayoutDashboardIcon,
    item: { id: "overview", label: "Overview", view: "overview" },
  },
  {
    kind: "item",
    icon: LayersIcon,
    item: { id: "namespaces", label: "Namespaces", view: "namespaces" },
  },
  {
    kind: "item",
    icon: ServerIcon,
    item: { id: "nodes", label: "Nodes", view: "nodes" },
  },
  {
    kind: "group",
    group: {
      id: "workloads",
      label: "Workloads",
      icon: BoxesIcon,
      items: [
        { id: "pods", label: "Pods", view: "pods" },
        { id: "deployments", label: "Deployments", view: "deployments" },
        { id: "daemonsets", label: "DaemonSets", view: "daemonsets" },
        { id: "statefulsets", label: "StatefulSets", view: "statefulsets" },
        { id: "replicasets", label: "ReplicaSets", view: "replicasets" },
        { id: "jobs", label: "Jobs", view: "jobs" },
        { id: "cronjobs", label: "CronJobs", view: "cronjobs" },
      ],
    },
  },
  {
    kind: "group",
    group: {
      id: "config",
      label: "Config",
      icon: Settings2Icon,
      items: [
        { id: "configmaps", label: "ConfigMaps", view: "configmaps" },
        { id: "secrets", label: "Secrets", view: "secrets" },
        { id: "resourcequotas", label: "Resource Quotas", view: "resourcequotas" },
        { id: "limitranges", label: "Limit Ranges", view: "limitranges" },
        { id: "hpa", label: "HPA", view: "hpa" },
        { id: "pdbs", label: "Pod Disruption Budgets", view: "pdbs" },
        { id: "priorityclasses", label: "Priority Classes", view: "priorityclasses" },
        { id: "leases", label: "Leases", view: "leases" },
        {
          id: "validatingwebhookconfigs",
          label: "Validating Webhook Configs",
          view: "validatingwebhookconfigs",
        },
      ],
    },
  },
  {
    kind: "group",
    group: {
      id: "network",
      label: "Network",
      icon: NetworkIcon,
      items: [
        { id: "services", label: "Services", view: "services" },
        { id: "endpointslices", label: "Endpoint Slices", view: "endpointslices" },
        { id: "endpoints", label: "Endpoints", view: "endpoints" },
        { id: "ingresses", label: "Ingresses", view: "ingresses" },
        { id: "ingressclasses", label: "Ingress Classes", view: "ingressclasses" },
        { id: "networkpolicies", label: "Network Policies", view: "networkpolicies" },
        { id: "portforwarding", label: "Port Forwarding", view: "portforwarding" },
      ],
    },
  },
  {
    kind: "group",
    group: {
      id: "storage",
      label: "Storage",
      icon: HardDriveIcon,
      items: [
        { id: "pvcs", label: "Persistent Volume Claims", view: "pvcs" },
        { id: "pvs", label: "Persistent Volumes", view: "pvs" },
        { id: "storageclasses", label: "Storage Classes", view: "storageclasses" },
      ],
    },
  },
  {
    kind: "group",
    group: {
      id: "access-control",
      label: "Access Control",
      icon: ShieldIcon,
      items: [
        { id: "serviceaccounts", label: "Service Accounts", view: "serviceaccounts" },
        { id: "clusterroles", label: "Cluster Roles", view: "clusterroles" },
        { id: "roles", label: "Roles", view: "roles" },
        { id: "clusterrolebindings", label: "Cluster Role Bindings", view: "clusterrolebindings" },
        { id: "rolebindings", label: "Role Bindings", view: "rolebindings" },
      ],
    },
  },
  {
    kind: "item",
    icon: ClockIcon,
    item: { id: "events", label: "Events", view: "events" },
  },
];

export const RESOURCE_LABEL: Record<string, string> = Object.fromEntries(
  NAV_CORE.flatMap((entry) => {
    if (entry.kind === "item" && entry.item.view) return [[entry.item.view, entry.item.label]];
    if (entry.kind === "group")
      return entry.group.items.flatMap((i) => (i.view ? [[i.view, i.label]] : []));
    return [];
  })
);
