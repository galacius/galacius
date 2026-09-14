import { Badge } from "@galacius/design-system";
import { FC } from "react";

function qosVariant(qos: string) {
  switch (qos) {
    case "Guaranteed":
      return "success";
    case "Burstable":
      return "warning";
    case "BestEffort":
      return "destructive";
    default:
      return "ghost";
  }
}

export const PodQoSBadge: FC<{ qos: string }> = ({ qos }) => {
  if (!qos) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={qosVariant(qos)}>{qos}</Badge>;
};
