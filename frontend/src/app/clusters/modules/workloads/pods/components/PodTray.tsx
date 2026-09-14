import { FC } from "react";
import type { PodContainerDetail } from "../api/resources";
import { PodExecTrayContent } from "./PodExecTrayContent";
import { PodLogTrayContent } from "./PodLogTrayContent";

export interface TrayTab {
  id: string;
  contextName: string;
  ns: string;
  pod: string;
  containers: PodContainerDetail[];
  mode: "logs" | "exec";
  ownerKind?: string;
  ownerName?: string;
}

export interface PodTrayProps {
  tab: TrayTab;
  collapsed: boolean;
}

export const PodTray: FC<PodTrayProps> = ({ tab, collapsed }) =>
  tab.mode === "logs" ? (
    <PodLogTrayContent tab={tab} collapsed={collapsed} />
  ) : (
    <PodExecTrayContent tab={tab} collapsed={collapsed} />
  );
