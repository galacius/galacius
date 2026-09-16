import { Badge } from "@galacius/design-system";
import { FC } from "react";

function eventTypeVariant(type: string) {
  switch (type) {
    case "Normal":
      return "success";
    case "Warning":
      return "warning";
    default:
      return "ghost";
  }
}

export const EventTypeBadge: FC<{ type: string }> = ({ type }) => {
  if (!type) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={eventTypeVariant(type)}>{type}</Badge>;
};
