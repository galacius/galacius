import { Badge, Tooltip, TooltipContent, TooltipTrigger } from "@galacius/design-system";
import { FC } from "react";

function healthVariant(status: string) {
  switch (status) {
    case "Healthy":
      return "success";
    case "Progressing":
      return "info";
    case "Degraded":
      return "destructive";
    default:
      return "ghost";
  }
}

interface Props {
  status: string;
  message: string;
}

export const ReplicaSetHealthBadge: FC<Props> = ({ status, message }) => {
  const badge = <Badge variant={healthVariant(status)}>{status}</Badge>;

  if (!message) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-lg">{message}</TooltipContent>
    </Tooltip>
  );
};
