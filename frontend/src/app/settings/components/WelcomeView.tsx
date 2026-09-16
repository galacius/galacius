import { CpuIcon, LayersIcon, NetworkIcon, ScrollTextIcon } from "@galacius/design-system";
import { FC } from "react";
import logo from "../../../assets/images/logo-universal.png";

const FEATURES = [
  { icon: LayersIcon, label: "Workloads", desc: "Pods, Deployments, DaemonSets, StatefulSets" },
  { icon: NetworkIcon, label: "Networking", desc: "Services, Ingresses, NetworkIcon Policies" },
  { icon: CpuIcon, label: "Nodes", desc: "CPU, memory and disk usage at a glance" },
  { icon: ScrollTextIcon, label: "Events", desc: "Cluster-wide event stream in real time" },
];

export const WelcomeView: FC = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-10 p-10">
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <img src={logo} alt="Galacius" className="mb-4 h-16 w-16 rounded-2xl" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Galacius</h1>
      <p className="text-sm text-muted-foreground">Lightweight Kubernetes Cluster Manager</p>
    </div>

    <div className="text-center">
      <p className="text-sm text-muted-foreground">
        Select a cluster from the sidebar to connect and start exploring.
      </p>
    </div>

    <div className="grid w-full max-w-lg grid-cols-2 gap-3">
      {FEATURES.map(({ icon: Icon, label, desc }) => (
        <div key={label} className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
          <p className="text-left text-xs text-muted-foreground">{desc}</p>
        </div>
      ))}
    </div>
  </div>
);
