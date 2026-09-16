import { Badge } from "@galacius/design-system";
import { FC } from "react";

function statusVariant(status: string) {
  switch (status) {
    case "Active":
      return "success";
    case "Inactive":
      return "danger";
    default:
      return "ghost";
  }
}

export const HPAStatusBadge: FC<{ status: string }> = ({ status }) => (
  <Badge variant={statusVariant(status)}>{status}</Badge>
);
