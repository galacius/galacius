import { FC } from "react";
import { PodTray } from "../../../../../modules/workloads/pods/components/PodTray";
import type { UnifiedTrayContentProps } from "../UnifiedTrayTypes";

export const PodTrayFamily: FC<UnifiedTrayContentProps> = ({ tab, collapsed }) => {
  if (tab.origin !== "core" || tab.family !== "pod") {
    return null;
  }

  return <PodTray tab={tab} collapsed={collapsed} />;
};
