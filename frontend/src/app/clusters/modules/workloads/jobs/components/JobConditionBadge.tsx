import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  formatRelativeTime,
} from "@galacius/design-system";
import { FC } from "react";
import type { JobCondition } from "../api/resources";

function conditionVariant(condition: string) {
  switch (condition.toLowerCase()) {
    case "complete":
    case "successcriteriamet":
      return "success";
    case "failed":
    case "failuretarget":
      return "destructive";
    case "suspended":
      return "warning";
    default:
      return "ghost";
  }
}

export const JobConditionBadge: FC<{ condition: string | JobCondition }> = ({ condition }) => {
  // Extract type for variant determination and label
  const type = typeof condition === "string" ? condition : condition.Type;
  const badge = <Badge variant={conditionVariant(type)}>{type}</Badge>;

  // If condition is a plain string, return badge without tooltip
  if (typeof condition === "string") {
    return badge;
  }

  // Collect non-empty fields in order: LastProbeTime, LastTransitionTime, Message, Reason, Status, Type
  const fields: Array<[string, string]> = [];
  if (condition.LastProbeTime)
    fields.push(["LastProbeTime", formatRelativeTime(condition.LastProbeTime)]);
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
