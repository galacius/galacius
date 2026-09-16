import { Badge, Tooltip, TooltipContent, TooltipTrigger } from "@galacius/design-system";
import { FC } from "react";
import type { Deployment } from "../api/resources";

function strategyVariant(type: string) {
  switch (type) {
    case "RollingUpdate":
      return "info";
    case "Recreate":
      return "warning";
    default:
      return "ghost";
  }
}

interface Props {
  deployment: Deployment;
}

export const DeploymentStrategyBadge: FC<Props> = ({ deployment }) => {
  const badge = (
    <Badge variant={strategyVariant(deployment.StrategyType)}>{deployment.StrategyType}</Badge>
  );

  const fields: Array<[string, string]> = [];
  if (deployment.MaxSurge) fields.push(["MaxSurge", deployment.MaxSurge]);
  if (deployment.MaxUnavailable) fields.push(["MaxUnavailable", deployment.MaxUnavailable]);

  if (fields.length === 0) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger className="w-fit">{badge}</TooltipTrigger>
      <TooltipContent className="max-w-lg">
        <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-2 text-xs">
          {fields.map(([label, value]) => (
            <div key={label} className="contents">
              <span className="text-right font-mono text-muted-foreground">{label}</span>
              <span className="font-mono">{value}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
