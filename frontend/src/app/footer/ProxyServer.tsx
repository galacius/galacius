import { Badge, Tooltip, TooltipContent, TooltipTrigger, cn } from "@galacius/design-system";
import { FC } from "react";
import {
  ProxyStatus,
  ProxyStatusType,
  useProxyStatusEvents,
} from "../clusters/shared/hooks/async-events/useProxyStatusEvents";
import { useGetClusterProxy } from "../clusters/shared/hooks/data-access/useGetClusterProxy";
import { useGetSettings } from "../settings/hooks/data-access/useGetSettings";

interface Props {
  activeContext: string;
}

const PROXY_STATUS_LABEL: Record<ProxyStatusType, string> = {
  [ProxyStatus.Idle]: "Idle",
  [ProxyStatus.Starting]: "Starting",
  [ProxyStatus.Ready]: "Ready",
  [ProxyStatus.Degraded]: "Degraded",
};

const PROXY_STATUS_DOT_CLASS: Record<ProxyStatusType, string> = {
  [ProxyStatus.Idle]: "bg-muted-foreground",
  [ProxyStatus.Starting]: "bg-warning",
  [ProxyStatus.Ready]: "bg-success",
  [ProxyStatus.Degraded]: "bg-destructive",
};

const PROXY_STATUS_BADGE_VARIANT: Record<
  ProxyStatusType,
  "ghost" | "warning" | "success" | "destructive"
> = {
  [ProxyStatus.Idle]: "ghost",
  [ProxyStatus.Starting]: "warning",
  [ProxyStatus.Ready]: "success",
  [ProxyStatus.Degraded]: "destructive",
};

export const ProxyServer: FC<Props> = ({ activeContext }) => {
  const { data: settings } = useGetSettings();
  const proxySetupEnabled = settings?.proxySetupEnabled ?? false;
  const { data: clusterProxy } = useGetClusterProxy(activeContext || null);
  const { data: proxyStatus } = useProxyStatusEvents(
    proxySetupEnabled && clusterProxy?.setupCommand ? activeContext : null
  );

  if (!proxySetupEnabled || !clusterProxy?.setupCommand || !proxyStatus) return null;

  const proxyState = proxyStatus.State as ProxyStatusType;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Tooltip>
        <TooltipTrigger>
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              PROXY_STATUS_DOT_CLASS[proxyState] ?? "bg-muted-foreground"
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="px-3.25 py-1.75">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5">
              {activeContext}{" "}
              <Badge variant={PROXY_STATUS_BADGE_VARIANT[proxyState] ?? "ghost"}>
                {PROXY_STATUS_LABEL[proxyState] ?? proxyStatus.State}
              </Badge>
            </span>
            {proxyStatus.Message && <span>{proxyStatus.Message}</span>}
          </div>
        </TooltipContent>
      </Tooltip>
      Proxy Server
    </div>
  );
};
