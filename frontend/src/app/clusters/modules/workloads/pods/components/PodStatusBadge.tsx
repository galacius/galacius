import { Badge } from "@galacius/design-system";
import { FC } from "react";

function statusVariant(status: string) {
  const s = status.toLowerCase();

  // Composite statuses (e.g. Job's "Active: 2, Failed: 3") can mention
  // multiple states at once — failed takes priority as the worst outcome.
  if (s.includes("failed")) {
    return "destructive";
  }
  if (s.includes("terminating") || s.includes("waiting")) {
    return "danger";
  }
  if (s.includes("running") || s.includes("succeeded")) {
    return "success";
  }
  if (s.includes("pending")) {
    return "info";
  }
  return "ghost";
}

export const PodStatusBadge: FC<{ status: string }> = ({ status }) => {
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
};
