import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  formatRelativeTime,
} from "@galacius/design-system";
import { FC } from "react";
import type { DeploymentCondition } from "../api/resources";

function conditionVariant(type: string, status?: string) {
  switch (type) {
    case "Available":
      return "success";
    case "Progressing":
      return "info";
    case "ReplicaFailure":
      return "destructive";
    default:
      if (status === "True") return "success";
      if (status === "False") return "destructive";
      return "ghost";
  }
}

interface Props {
  condition: DeploymentCondition;
}

export const DeploymentConditionBadge: FC<Props> = ({ condition }) => {
  const badge = (
    <Badge variant={conditionVariant(condition.Type, condition.Status)}>{condition.Type}</Badge>
  );

  // Collect non-empty fields in order: LastTransitionTime, LastUpdateTime, Message, Reason, Status, Type
  const fields: Array<[string, string]> = [];
  if (condition.LastTransitionTime)
    fields.push(["LastTransitionTime", formatRelativeTime(condition.LastTransitionTime)]);
  if (condition.LastUpdateTime)
    fields.push(["LastUpdateTime", formatRelativeTime(condition.LastUpdateTime)]);
  if (condition.Message) fields.push(["Message", condition.Message]);
  if (condition.Reason) fields.push(["Reason", condition.Reason]);
  if (condition.Status) fields.push(["Status", condition.Status]);
  if (condition.Type) fields.push(["Type", condition.Type]);

  // If no fields to display, return badge only
  if (fields.length === 0) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-lg">
        <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-2 text-xs">
          {fields.map(([label, value]) => (
            <div key={label} className="contents">
              <span className="text-right font-mono text-muted-foreground">{label}</span>
              <span className="font-mono">{value}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
