import { Badge } from "@galacius/design-system";
import { FC } from "react";

function statusVariant(status: string) {
  switch (status) {
    case "Bound":
      return "success";
    case "Pending":
      return "warning";
    case "Lost":
      return "destructive";
    case "Terminating":
      return "danger";
    default:
      return "ghost";
  }
}

export const PersistentVolumeClaimStatusBadge: FC<{ status: string }> = ({ status }) => (
  <Badge variant={statusVariant(status)}>{status}</Badge>
);
