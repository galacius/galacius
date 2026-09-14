import { Badge } from "@galacius/design-system";
import { FC } from "react";

function statusVariant(status: string) {
  switch (status) {
    case "Active":
    case "Running":
      return "success";
    case "Starting":
      return "warning";
    case "Error":
      return "destructive";
    default:
      return "ghost";
  }
}

interface PortForwardStatusBadgeProps {
  status: string;
}

export const PortForwardStatusBadge: FC<PortForwardStatusBadgeProps> = ({ status }) => (
  <Badge variant={statusVariant(status)}>{status}</Badge>
);
