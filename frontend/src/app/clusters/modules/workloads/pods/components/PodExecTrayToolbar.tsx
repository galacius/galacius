import {
  Button,
  RotateCcwIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@galacius/design-system";

import { FC } from "react";
import type { TrayTab } from "./PodTray";
import { PodMetaStrip } from "./PodMetaStrip";
import { execStatusDotClass } from "./podStatusUtils";

interface PodExecTrayToolbarProps {
  collapsed: boolean;
  tab: TrayTab;
  container: string;
  onContainerChange: (c: string) => void;
  execStatus: string;
  onReconnect: () => void;
}

export const PodExecTrayToolbar: FC<PodExecTrayToolbarProps> = ({
  collapsed,
  tab,
  container,
  onContainerChange,
  execStatus,
  onReconnect,
}) => (
  <div className={cn("flex h-10 shrink-0 items-center gap-2 border-b px-3", collapsed && "hidden")}>
    <PodMetaStrip tab={tab} />

    {tab.containers.length > 0 && (
      <Select
        value={container}
        onValueChange={(v) => {
          if (v) onContainerChange(v);
        }}
      >
        <SelectTrigger className="h-6 w-fit text-xs" size="sm">
          <SelectValue placeholder="ContainerIcon" />
        </SelectTrigger>
        <SelectContent
          className="w-fit"
          positionerClassName="z-popover-nested"
          alignItemWithTrigger={false}
        >
          {tab.containers.map((c) => (
            <SelectItem key={c.Name} value={c.Name}>
              {c.Name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}

    <div className="ml-auto flex shrink-0 items-center gap-2">
      <span
        className={cn("inline-block h-2 w-2 rounded-full", execStatusDotClass(execStatus))}
        title={execStatus}
      />
      {["closed", "error"].includes(execStatus) && (
        <Button
          variant="ghost"
          size="xs"
          className="gap-1.5"
          aria-label="Reconnect"
          onClick={onReconnect}
        >
          <RotateCcwIcon className="size-3.5" />
          Reconnect
        </Button>
      )}
    </div>
  </div>
);
