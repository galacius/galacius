import { Badge } from "@galacius/design-system";
import { FC } from "react";

function statusVariant(status: string) {
  switch (status.toLowerCase()) {
    case "bound":
      return "success";
    case "available":
      return "info";
    case "released":
      return "warning";
    case "failed":
      return "destructive";
    case "terminating":
      return "danger";
    default:
      return "ghost";
  }
}

export const PersistentVolumeStatusBadge: FC<{ status: string }> = ({ status }) => (
  <Badge variant={statusVariant(status)}>{status}</Badge>
);
