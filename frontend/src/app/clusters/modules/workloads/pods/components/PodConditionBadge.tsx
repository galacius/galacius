import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  formatRelativeTime,
} from "@galacius/design-system";
import { FC } from "react";
import type { PodCondition } from "../api/resources";

function conditionVariant(c: PodCondition) {
  if (c.Status === "True") return "success";
  if (c.Type === "Ready") return "destructive";
  if (c.Status === "False") return "danger";
  return "ghost";
}

interface Props {
  condition: PodCondition;
}

export const PodConditionBadge: FC<Props> = ({ condition }) => {
  const badge = <Badge variant={conditionVariant(condition)}>{condition.Type}</Badge>;

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
