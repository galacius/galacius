import { Badge } from "@galacius/design-system";
import { FC } from "react";

export const CronJobResumedBadge: FC<{ resumed: boolean }> = ({ resumed }) => (
  <Badge variant={resumed ? "success" : "danger"}>{resumed ? "True" : "False"}</Badge>
);
