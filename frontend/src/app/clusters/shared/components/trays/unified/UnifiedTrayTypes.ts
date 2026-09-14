import { ComponentType, ReactNode } from "react";
import type { PodContainerDetail } from "../../../../modules/workloads/pods/api/resources";

// Discriminated union of core (built-in) tab types, plus a generic catch-all
// for plugin-owned families — the host never knows their field shapes ahead
// of time, only the generic `label`/`icon`/`params` envelope. Plugins read
// their own shape back out of `params` (see SharedUnifiedTrayTab).
//
// `origin` is the actual discriminant: a plugin family's `family` is a plain
// `string`, which TS can't statically distinguish from the "modification"/
// "pod" literals, so narrowing on `family` alone wouldn't exclude the plugin
// variant. `origin: "core" | "plugin"` are disjoint literals, so narrowing
// on it works everywhere.
export type UnifiedTrayTab =
  | {
      origin: "core";
      family: "modification";
      id: string;
      kind: string;
      name: string;
      namespace?: string;
    }
  | {
      origin: "core";
      family: "pod";
      id: string;
      contextName: string;
      ns: string;
      pod: string;
      containers: PodContainerDetail[];
      mode: "logs" | "exec";
      ownerKind?: string;
      ownerName?: string;
    }
  | {
      origin: "plugin";
      family: string;
      id: string;
      label: string;
      icon?: ReactNode;
      pluginId: string;
      params: Record<string, unknown>;
    };

export interface UnifiedTrayContentProps {
  tab: UnifiedTrayTab;
  collapsed: boolean;
  onClose: () => void;
}

export type UnifiedTrayContentComponent = ComponentType<UnifiedTrayContentProps>;
