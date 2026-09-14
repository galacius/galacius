import { Badge } from "@galacius/design-system";
import { FC } from "react";

function statusVariant(schedulable: boolean) {
  return schedulable ? "success" : "destructive";
}

export const NodeSchedulableBadge: FC<{ schedulable: boolean }> = ({ schedulable }) => (
  <Badge variant={statusVariant(schedulable)}>{schedulable ? "True" : "False"}</Badge>
);
