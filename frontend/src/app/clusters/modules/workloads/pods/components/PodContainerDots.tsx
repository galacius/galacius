import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from "@galacius/design-system";
import { FC } from "react";
import type { PodContainerDetail } from "../api/resources";
import { containerDotColorClass } from "./podStatusUtils";

const EMPTY_CONTAINER_DETAILS: readonly PodContainerDetail[] = [];

function containerTooltipTitle(name: string, statusMessage: string, isInit: boolean): string {
  if (!isInit) return `${name} ${statusMessage}`;
  const stateMatch = statusMessage.match(/^([^,\s]+)/);
  const state = stateMatch?.[0] ?? "";
  const rest = statusMessage.slice(state.length);
  return `${name} ${state}, init${rest}`;
}

export const PodContainerDots: FC<{
  containerDetails?: PodContainerDetail[];
  initContainerDetails?: PodContainerDetail[];
}> = ({
  containerDetails = EMPTY_CONTAINER_DETAILS,
  initContainerDetails = EMPTY_CONTAINER_DETAILS,
}) => {
  const allContainers = [
    ...initContainerDetails.map((c) => ({ ...c, isInit: true })),
    ...containerDetails.map((c) => ({ ...c, isInit: false })),
  ];

  const readyCount = allContainers.filter((c) => c.Ready).length;
  const label = `${readyCount}/${allContainers.length}`;

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <TooltipProvider>
        <div className="flex gap-1">
          {allContainers.map((c) => {
            const title = containerTooltipTitle(c.Name, c.StatusMessage, c.isInit);
            const fields: [string, string][] = [];
            if (c.ExitCode !== null && c.ExitCode !== undefined)
              fields.push(["Exit Code", String(c.ExitCode)]);
            if (c.Reason) fields.push(["Reason", c.Reason]);
            if (c.StartedAt) fields.push(["Started At", c.StartedAt]);
            if (c.FinishedAt) fields.push(["Finished At", c.FinishedAt]);
            if (c.ContainerID) fields.push(["ContainerIcon ID", c.ContainerID]);
            return (
              <Tooltip key={c.Name}>
                <TooltipTrigger
                  render={
                    <span
                      className={cn(
                        "inline-block h-2.5 w-2.5 rounded-xs",
                        containerDotColorClass(c.Status, c.Ready) ??
                          "border border-muted-foreground/40"
                      )}
                    />
                  }
                />
                <TooltipContent className="max-w-lg">
                  <div className="flex flex-col gap-2">
                    <div className="text-center text-xs font-semibold">{title}</div>
                    {fields.length > 0 && (
                      <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-2 text-xs">
                        {fields.map(([fLabel, fValue]) => (
                          <div key={fLabel} className="contents">
                            <span className="text-right font-mono text-muted-foreground">
                              {fLabel}
                            </span>
                            <span className="font-mono wrap-anywhere">{fValue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
};
