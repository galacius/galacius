import { Badge } from "@galacius/design-system";
import { FC } from "react";

export const JobResumedBadge: FC<{ resumed: boolean }> = ({ resumed }) => (
  <Badge variant={resumed ? "success" : "danger"}>{resumed ? "True" : "False"}</Badge>
);
