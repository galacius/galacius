import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  formatRelativeTime,
} from "@galacius/design-system";
import { FC } from "react";
import type { NodeCondition } from "../api/resources";

function conditionVariant(c: NodeCondition) {
  /** positive types */
  if (c.Type === "Ready")
    switch (c.Status) {
      case "True":
        return "success";
      case "False":
        return "destructive";
      default:
        return "ghost";
    }

  /** negative types */
  switch (c.Status) {
    case "True":
      return "destructive";
    case "False":
      return "success";
    default:
      return "ghost";
  }
}

interface Props {
  condition: NodeCondition;
}

export const NodeConditionBadge: FC<Props> = ({ condition }) => {
  const badge = <Badge variant={conditionVariant(condition)}>{condition.Type}</Badge>;

  // Collect non-empty fields in order: LastHeartbeatTime, LastTransitionTime, Message, Reason, Status, Type
  const fields: Array<[string, string]> = [];
  if (condition.LastHeartbeatTime)
    fields.push(["LastHeartbeatTime", formatRelativeTime(condition.LastHeartbeatTime)]);
  if (condition.LastTransitionTime)
    fields.push(["LastTransitionTime", formatRelativeTime(condition.LastTransitionTime)]);
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
