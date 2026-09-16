import {
  AnnotationBadge,
  Badge,
  Button,
  ButtonGroup,
  ChevronDownIcon,
  ChevronUpIcon,
  DatabaseIcon,
  LoadingSpinner,
  ResourceDeletionButton,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceDetailEmptyBody,
  ResourceLink,
  ResourceModificationButton,
  ScrollArea,
  ScrollTextIcon,
  Separator,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TerminalIcon,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from "@galacius/design-system";
import { FC, useEffect, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { useResourceLinks } from "../../../../shared/hooks/useResourceLinks";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { PortForward } from "../../../networks/portforwarding/api/resources";
import { PortForwardCtaButton } from "../../../networks/portforwarding/components/PortForwardCtaButton";
import { PortForwardOperationDialog } from "../../../networks/portforwarding/components/PortForwardOperationDialog";
import { useGetPortForwards } from "../../../networks/portforwarding/hooks/data-access/useGetPortForwards";
import type { Pod, PodContainerDetail, PodContainerPort, PodVolume } from "../api/resources";
import { useGetPodDetail } from "../hooks/data-access/useGetPodDetail";
import { useDeletePod } from "../hooks/data-mutation/useDeletePod";
import { PodConditionBadge } from "./PodConditionBadge";
import { PodDeleteConfirmationModal } from "./PodDeleteConfirmationModal";
import { PodQoSBadge } from "./PodQoSBadge";
import { PodStatusBadge } from "./PodStatusBadge";

function parseProbe(raw: string): { label: string; params: string[] } {
  const parts = raw.trim().split(/\s+/);
  return { label: parts.slice(0, 2).join(" "), params: parts.slice(2) };
}

function readinessMessage({ Ready, Status, StatusMessage }: PodContainerDetail) {
  if (Ready) return StatusMessage;
  if (Status === "running") return "Not ready: readiness probe has not yet passed";
  return "Not ready";
}

const ContainerReadinessDot: FC<{ cd: PodContainerDetail }> = ({ cd }) => {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              cd.Ready ? "bg-success" : "bg-destructive"
            )}
          />
        }
      />
      <TooltipContent>{readinessMessage(cd)}</TooltipContent>
    </Tooltip>
  );
};

const InitContainerBlock: FC<{ icd: PodContainerDetail }> = ({ icd }) => {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ContainerReadinessDot cd={icd} />
          <span className="font-mono text-xs font-semibold">{icd.Name}</span>
        </div>
        <PodStatusBadge status={icd.Status} />
      </div>

      <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-y-1.5">
        <span className="text-h3 text-muted-foreground">Image</span>
        <span className="text-body font-mono break-all">{icd.Image}</span>

        <span className="text-h3 text-muted-foreground">Environment</span>
        {(icd.EnvVars ?? []).length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {icd.EnvVars.map((e) => (
              <span key={e} className="text-body font-mono break-all">
                {e}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}

        {(icd.Mounts ?? []).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Mounts</span>
            <div className="flex flex-col gap-1">
              {icd.Mounts.map((m) => (
                <div key={m.Path} className="flex flex-col">
                  <span className="text-body font-mono">{m.Path}</span>
                  <span className="text-xs text-muted-foreground">
                    from {m.Name} ({m.ReadOnly ? "ro" : "rw"})
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {(icd.Command ?? []).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Command</span>
            <pre className="rounded bg-muted/30 p-2 font-mono text-xs break-all whitespace-pre-wrap">
              {icd.Command.join(" ")}
            </pre>
          </>
        )}

        {(icd.Args ?? []).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Arguments</span>
            <pre className="rounded bg-muted/30 p-2 font-mono text-xs break-all whitespace-pre-wrap">
              {icd.Args.join(" ")}
            </pre>
          </>
        )}
      </div>
    </div>
  );
};

const ContainerBlock: FC<{
  cd: PodContainerDetail;
  pod: { Name: string; Namespace: string };
  portForwards: PortForward[];
  onForwardPort: (p: PodContainerPort) => void;
  onNavigateToPortForwarding: () => void;
}> = ({ cd, pod, portForwards, onForwardPort, onNavigateToPortForwarding }) => {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ContainerReadinessDot cd={cd} />
          <span className="font-mono text-xs font-semibold">{cd.Name}</span>
        </div>
        <PodStatusBadge status={cd.Status} />
      </div>

      <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-y-1.5">
        {cd.LastStatus && (
          <>
            <span className="text-h3 text-muted-foreground">Last Status</span>
            <div className="flex flex-col gap-0.5 text-xs">
              <span>
                Reason: {cd.LastStatus.Reason} - exit code: {cd.LastStatus.ExitCode}
              </span>
              {cd.LastStatus.Started && <span>Started: {cd.LastStatus.Started}</span>}
              {cd.LastStatus.Finished && <span>Finished: {cd.LastStatus.Finished}</span>}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Image</span>
        <span className="text-body font-mono break-all">{cd.Image}</span>

        <span className="text-h3 text-muted-foreground">Ports</span>
        {(cd.Ports ?? []).length > 0 ? (
          <div className="flex flex-col gap-1">
            {cd.Ports.map((p) => {
              const activePf = portForwards.find(
                (pf) =>
                  pf.Name === pod.Name &&
                  pf.Namespace === pod.Namespace &&
                  pf.PodPort === String(p.ContainerPort) &&
                  pf.Protocol === p.Protocol &&
                  pf.Kind === "pod"
              );
              return (
                <div key={`${p.ContainerPort}-${p.Protocol}`} className="flex items-center gap-2">
                  <span className="text-body font-mono">
                    {p.Name ? `${p.Name} ` : ""}
                    {p.HostIP}:{p.HostPort} → {p.ContainerPort}/{p.Protocol}
                  </span>
                  <PortForwardCtaButton
                    activePf={activePf}
                    port={p.ContainerPort}
                    svcName={pod.Name}
                    onForwardPort={() => onForwardPort(p)}
                    onNavigateToPortForwarding={onNavigateToPortForwarding}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}

        <span className="text-h3 text-muted-foreground">Environment</span>
        {(cd.EnvVars ?? []).length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {cd.EnvVars.map((e) => (
              <span key={e} className="text-body font-mono break-all">
                {e}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}

        {(cd.Mounts ?? []).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Mounts</span>
            <div className="flex flex-col gap-1">
              {cd.Mounts.map((m) => (
                <div key={m.Path} className="flex flex-col">
                  <span className="text-body font-mono">{m.Path}</span>
                  <span className="text-xs text-muted-foreground">
                    from {m.Name} ({m.ReadOnly ? "ro" : "rw"})
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {cd.Liveness &&
          (() => {
            const { label, params } = parseProbe(cd.Liveness);
            return (
              <>
                <span className="text-h3 text-muted-foreground">Liveness</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-body font-mono break-all">{label}</span>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {params.map((p, i) => (
                      <Badge key={`${i}-${p}`} variant="secondary" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

        {cd.Readiness &&
          (() => {
            const { label, params } = parseProbe(cd.Readiness);
            return (
              <>
                <span className="text-h3 text-muted-foreground">Readiness</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-body font-mono break-all">{label}</span>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {params.map((p, i) => (
                      <Badge key={`${i}-${p}`} variant="secondary" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

        {cd.Startup &&
          (() => {
            const { label, params } = parseProbe(cd.Startup);
            return (
              <>
                <span className="text-muted-foreground">Startup</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs break-all">{label}</span>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {params.map((p, i) => (
                      <Badge key={`${i}-${p}`} variant="secondary" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

        {(cd.Command ?? []).length > 0 && (
          <>
            <span className="text-muted-foreground">Command</span>
            <pre className="rounded bg-muted/30 p-2 font-mono text-xs break-all whitespace-pre-wrap">
              {cd.Command.join(" ")}
            </pre>
          </>
        )}

        {(cd.CPURequest || cd.MemRequest || cd.DiskRequest) && (
          <>
            <span className="text-muted-foreground">Requests</span>
            <div className="flex flex-wrap gap-1">
              {cd.CPURequest && (
                <Badge variant="secondary" className="text-xs">
                  cpu={cd.CPURequest}
                </Badge>
              )}
              {cd.MemRequest && (
                <Badge variant="secondary" className="text-xs">
                  memory={cd.MemRequest}
                </Badge>
              )}
              {cd.DiskRequest && (
                <Badge variant="secondary" className="text-xs">
                  disk={cd.DiskRequest}
                </Badge>
              )}
            </div>
          </>
        )}

        {(cd.CPULimit || cd.MemLimit || cd.DiskLimit) && (
          <>
            <span className="text-muted-foreground">Limits</span>
            <div className="flex flex-wrap gap-1">
              {cd.CPULimit && (
                <Badge variant="secondary" className="text-xs">
                  cpu={cd.CPULimit}
                </Badge>
              )}
              {cd.MemLimit && (
                <Badge variant="secondary" className="text-xs">
                  memory={cd.MemLimit}
                </Badge>
              )}
              {cd.DiskLimit && (
                <Badge variant="secondary" className="text-xs">
                  disk={cd.DiskLimit}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function sourceLabel(type: string): string {
  switch (type) {
    case "ServiceAccountToken":
      return "Service Account Token";
    case "ConfigMap":
      return "Config Map";
    case "DownwardAPI":
      return "Downward API";
    case "Secret":
      return "Secret";
    default:
      return type;
  }
}

const VolumeBlock: FC<{ v: PodVolume }> = ({ v }) => (
  <div className="rounded-md border text-xs">
    <div className="flex items-center gap-2 border-b px-3 py-2">
      <DatabaseIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="font-mono font-semibold">{v.Name}</span>
    </div>
    <div className="divide-y">
      <div className="grid grid-cols-[140px_minmax(0,1fr)] px-3 py-2">
        <span className="text-muted-foreground">Kind</span>
        <span className="font-mono">{v.Kind}</span>
      </div>
      {v.Kind === "emptyDir" && (
        <div className="grid grid-cols-[140px_minmax(0,1fr)] px-3 py-2">
          <span className="text-muted-foreground">Medium</span>
          <span className={cn("font-mono", !v.Medium && "text-muted-foreground italic")}>
            {v.Medium || "<node's default medium>"}
          </span>
        </div>
      )}
      {v.HostPath && (
        <div className="grid grid-cols-[140px_minmax(0,1fr)] px-3 py-2">
          <span className="text-muted-foreground">Host Path</span>
          <span className="font-mono">{v.HostPath}</span>
        </div>
      )}
      {v.CheckBehavior && (
        <div className="grid grid-cols-[140px_minmax(0,1fr)] px-3 py-2">
          <span className="text-muted-foreground">CheckIcon Behavior</span>
          <span className="font-mono">{v.CheckBehavior}</span>
        </div>
      )}
      {v.DefaultMode && (
        <div className="grid grid-cols-[140px_minmax(0,1fr)] px-3 py-2">
          <span className="text-muted-foreground">Default Mount Mode</span>
          <span className="font-mono">{v.DefaultMode}</span>
        </div>
      )}
      {(v.Sources ?? []).length > 0 && (
        <div className="grid grid-cols-[140px_minmax(0,1fr)] items-start px-3 py-2">
          <span className="text-muted-foreground">Sources</span>
          <div className="flex flex-col gap-2">
            {v.Sources.map((src) => (
              <div
                key={`${src.Type}/${src.Path}/${src.Name}/${src.Expiration}`}
                className="rounded border"
              >
                <div className="bg-muted/50 px-3 py-1.5 font-medium">{sourceLabel(src.Type)}</div>
                <div className="divide-y">
                  {src.Expiration && (
                    <div className="grid grid-cols-[100px_minmax(0,1fr)] px-3 py-1.5">
                      <span className="text-muted-foreground">Expiration</span>
                      <span className="font-mono">{src.Expiration}</span>
                    </div>
                  )}
                  {src.Path && (
                    <div className="grid grid-cols-[100px_minmax(0,1fr)] px-3 py-1.5">
                      <span className="text-muted-foreground">Path</span>
                      <span className="font-mono">{src.Path}</span>
                    </div>
                  )}
                  {src.Name && (
                    <div className="grid grid-cols-[100px_minmax(0,1fr)] px-3 py-1.5">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-mono">{src.Name}</span>
                    </div>
                  )}
                  {(src.Items ?? []).length > 0 && (
                    <div className="grid grid-cols-[100px_minmax(0,1fr)] items-start px-3 py-1.5">
                      <span className="text-muted-foreground">Items</span>
                      <div className="flex flex-col gap-0.5">
                        {src.Items.map((item) => (
                          <span key={item} className="font-mono">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

const PodOverviewTab: FC<{
  pod: Pod;
  onNavigateToPortForwarding: () => void;
}> = ({ pod, onNavigateToPortForwarding }) => {
  const { activeContext } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleNodeDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleNodeDetail: v.onToggleNodeDetail,
  }));
  const resourceLinks = useResourceLinks();

  const [showTolerations, setShowTolerations] = useState(false);
  const [showAffinities, setShowAffinities] = useState(false);
  const [selectedPort, setSelectedPort] = useState<PodContainerPort | null>(null);

  const { data: portForwards = [] } = useGetPortForwards({ context: activeContext });

  return (
    <>
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-0">
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4 text-xs">
            <span className="text-muted-foreground">Name</span>
            <span className="font-mono">{pod.Name}</span>

            <span className="text-muted-foreground">Namespace</span>
            <ResourceLink onClick={() => onToggleNamespaceDetail(pod.Namespace)}>
              {pod.Namespace}
            </ResourceLink>

            <span className="text-muted-foreground">Created</span>
            <span className="font-mono">
              {pod.Age} ago ({pod.CreatedAt})
            </span>

            <span className="text-muted-foreground">Status</span>
            <span className="font-mono">{pod.Status}</span>

            <span className="text-muted-foreground">Node</span>
            {pod.NodeName ? (
              <ResourceLink onClick={() => onToggleNodeDetail(pod.NodeName)}>
                {pod.NodeName}
              </ResourceLink>
            ) : (
              <span className="font-mono">—</span>
            )}

            <span className="text-muted-foreground">QoS</span>
            <PodQoSBadge qos={pod.QoS} />

            <span className="text-muted-foreground">Service Account</span>
            {pod.ServiceAccount ? (
              <ResourceLink
                onClick={() => resourceLinks.serviceaccount(pod.Namespace, pod.ServiceAccount)}
              >
                {pod.ServiceAccount}
              </ResourceLink>
            ) : (
              <span className="font-mono">—</span>
            )}

            <span className="text-muted-foreground">Priority Class</span>
            <span className="font-mono">{pod.PriorityClass || "—"}</span>

            <span className="text-muted-foreground">Termination Grace</span>
            <span className="font-mono">{pod.TerminationGracePeriod || "—"}</span>

            <span className="text-muted-foreground">Controlled By</span>
            {pod.ControlledBy ? (
              <span className="font-mono">
                {pod.ControlledBy}:{" "}
                {resourceLinks[pod.ControlledBy.toLowerCase()] ? (
                  <ResourceLink
                    onClick={() =>
                      resourceLinks[pod.ControlledBy.toLowerCase()](
                        pod.Namespace,
                        pod.ControlledByName
                      )
                    }
                  >
                    {pod.ControlledByName}
                  </ResourceLink>
                ) : (
                  pod.ControlledByName
                )}
              </span>
            ) : (
              <span className="font-mono">—</span>
            )}

            {(pod.HostIPs ?? []).length > 0 && (
              <>
                <span className="text-muted-foreground">Host IPs</span>
                <span className="font-mono">{pod.HostIPs.join(", ")}</span>
              </>
            )}

            {(pod.PodIPs ?? []).length > 0 && (
              <>
                <span className="text-muted-foreground">Pod IPs</span>
                <span className="font-mono">{pod.PodIPs.join(", ")}</span>
              </>
            )}

            <span className="text-muted-foreground">Tolerations</span>
            <div className="flex items-center justify-between">
              <span className="font-mono">{pod.Tolerations}</span>
              {pod.Tolerations > 0 && (
                <Button
                  variant="link"
                  size="xs"
                  className="h-auto w-fit gap-1 p-0 text-info"
                  aria-expanded={showTolerations}
                  onClick={() => setShowTolerations((v) => !v)}
                >
                  {showTolerations ? "Hide" : "Show"}
                  {showTolerations ? (
                    <ChevronUpIcon className="size-3" />
                  ) : (
                    <ChevronDownIcon className="size-3" />
                  )}
                </Button>
              )}
            </div>

            {showTolerations && (
              <div className="col-span-2">
                <Table className="border">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Key</TableHead>
                      <TableHead className="text-xs">Operator</TableHead>
                      <TableHead className="text-xs">Value</TableHead>
                      <TableHead className="text-xs">Effect</TableHead>
                      <TableHead className="text-xs">Seconds</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pod.TolerationDetails.map((t) => (
                      <TableRow key={`${t.Key}-${t.Operator}-${t.Value}-${t.Effect}-${t.Seconds}`}>
                        <TableCell className="font-mono text-xs">{t.Key || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{t.Operator}</TableCell>
                        <TableCell className="font-mono text-xs">{t.Value || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{t.Effect || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{t.Seconds ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {pod.AffinityCount > 0 && (
              <>
                <span className="text-muted-foreground">Affinities</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono">{pod.AffinityCount}</span>
                  <Button
                    variant="link"
                    size="xs"
                    className="h-auto w-fit gap-1 p-0 text-info"
                    aria-expanded={showAffinities}
                    onClick={() => setShowAffinities((v) => !v)}
                  >
                    {showAffinities ? "Hide" : "Show"}
                    {showAffinities ? (
                      <ChevronUpIcon className="size-3" />
                    ) : (
                      <ChevronDownIcon className="size-3" />
                    )}
                  </Button>
                </div>
                {showAffinities && (
                  <Textarea variant="code" disabled value={pod.Affinities} className="col-span-2" />
                )}
              </>
            )}

            {Object.keys(pod.Labels ?? {}).length > 0 && (
              <>
                <span className="text-muted-foreground">Labels</span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(pod.Labels).map(([k, v]) => (
                    <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                  ))}
                </div>
              </>
            )}

            {Object.keys(pod.Annotations ?? {}).length > 0 && (
              <>
                <span className="text-muted-foreground">Annotations</span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(pod.Annotations).map(([k, v]) => (
                    <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                  ))}
                </div>
              </>
            )}

            {(pod.ManagedFields ?? []).length > 0 && (
              <>
                <span className="self-start pt-0.5 text-muted-foreground">Managed Fields</span>
                <div className="flex min-w-0 flex-col gap-2">
                  {pod.ManagedFields.map((mf) => (
                    <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
                  ))}
                </div>
              </>
            )}

            {(pod.Conditions ?? []).length > 0 && (
              <>
                <span className="text-muted-foreground">Conditions</span>
                <div className="flex flex-wrap gap-1">
                  {pod.Conditions.map((c) => (
                    <PodConditionBadge key={c.Type} condition={c} />
                  ))}
                </div>
              </>
            )}
          </div>

          {(pod.InitContainerDetails ?? []).length > 0 && (
            <>
              <Separator />
              <SectionDivider
                label="Init Containers"
                className="border-y-0 bg-muted/50 tracking-wide uppercase"
              />
              <div className="flex flex-col gap-2 p-4">
                {pod.InitContainerDetails.map((icd) => (
                  <InitContainerBlock key={icd.Name} icd={icd} />
                ))}
              </div>
            </>
          )}

          {(pod.ContainerDetails ?? []).length > 0 && (
            <>
              <Separator />
              <SectionDivider
                label="Containers"
                className="border-y-0 bg-muted/50 tracking-wide uppercase"
              />
              <div className="flex flex-col gap-2 p-4">
                {pod.ContainerDetails.map((cd) => (
                  <ContainerBlock
                    key={cd.Name}
                    cd={cd}
                    pod={pod}
                    portForwards={portForwards}
                    onForwardPort={setSelectedPort}
                    onNavigateToPortForwarding={onNavigateToPortForwarding}
                  />
                ))}
              </div>
            </>
          )}

          {(pod.Volumes ?? []).length > 0 && (
            <>
              <Separator />
              <SectionDivider
                label="Volumes"
                className="border-y-0 bg-muted/50 tracking-wide uppercase"
              />
              <div className="flex flex-col gap-2 p-4">
                {pod.Volumes.map((v) => (
                  <VolumeBlock key={v.Name} v={v} />
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {selectedPort && (
        <PortForwardOperationDialog
          key={`${selectedPort.ContainerPort}/${selectedPort.Protocol}`}
          open={!!selectedPort}
          resourceName={pod.Name}
          namespace={pod.Namespace}
          kind="pod"
          podPort={String(selectedPort.ContainerPort)}
          protocol={selectedPort.Protocol}
          onClose={() => setSelectedPort(null)}
          onNavigateToPortForwarding={onNavigateToPortForwarding}
        />
      )}
    </>
  );
};

const PodEventsTab: FC<{ pod: Pod }> = ({ pod }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [pod.Namespace],
  });
  const podEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "pod" &&
      e.InvolvedObjectName === pod.Name &&
      e.Namespace === pod.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={podEvents} />
    </ScrollArea>
  );
};

interface PodDrawerCtaButtonsProps {
  onToggleTray: (mode: "logs" | "exec") => void;
  podName: string;
  podNs: string;
  onClose: () => void;
}

const PodDrawerCtaButtons: FC<PodDrawerCtaButtonsProps> = ({
  onToggleTray,
  podName,
  podNs,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { mutate: deletePod, isPending: isDeletePending } = useDeletePod();
  const { tabs, openTab } = useUnifiedTray();

  const logsActive = tabs.some(
    (t) =>
      t.origin === "core" &&
      t.family === "pod" &&
      t.pod === podName &&
      t.ns === podNs &&
      t.mode === "logs"
  );
  const execActive = tabs.some(
    (t) =>
      t.origin === "core" &&
      t.family === "pod" &&
      t.pod === podName &&
      t.ns === podNs &&
      t.mode === "exec"
  );

  const handleDeleteConfirm = () => {
    deletePod(
      { namespace: podNs, name: podName },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onClose();
        },
      }
    );
  };

  return (
    <>
      <ButtonGroup>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Open Pod Logs"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(logsActive && "text-success")}
                  onClick={() => onToggleTray("logs")}
                >
                  <ScrollTextIcon />
                </Button>
              }
            />
            <TooltipContent side="bottom">Pod Logs</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Open Pod Shell"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(execActive && "text-success")}
                  onClick={() => onToggleTray("exec")}
                >
                  <TerminalIcon />
                </Button>
              }
            />
            <TooltipContent side="bottom">Pod Shell</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <ResourceModificationButton
          mode="icon-button"
          ariaLabel="Edit Pod"
          onClick={() =>
            openTab("modification", {
              kind: "Pod",
              name: podName,
              namespace: podNs,
            })
          }
        />
        <ResourceDeletionButton
          mode="icon-button"
          ariaLabel="Delete Pod"
          disabled={isDeletePending}
          onClick={() => setShowDeleteModal(true)}
        />
      </ButtonGroup>

      <PodDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={podName}
        namespace={podNs}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface PodDetailDrawerProps {
  podName: string | null;
  podNamespace: string | null;
  open: boolean;
  onClose: () => void;
  onNavigateToPortForwarding: () => void;
}

const PodDrawerBody: FC<
  PodDetailDrawerProps & {
    podName: string;
    podNamespace: string;
    onDataChange: (pod: Pod | undefined) => void;
  }
> = ({ podName, podNamespace, open, onClose, onNavigateToPortForwarding, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: pod, isLoading } = useGetPodDetail(activeContext, podNamespace, podName);
  useCatchForbiddenResource("pods", {
    open,
    resourceName: podName,
    resourceLabel: "Pod",
    namespace: podNamespace,
    onForbiddenDetected: onClose,
  });

  const [eventsVisible, setEventsVisible] = useState(false);

  useEffect(() => {
    onDataChange(pod);
  }, [pod, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!pod) {
    return <ResourceDetailEmptyBody resourceKind="Pod" />;
  }

  return (
    <Tabs
      defaultValue="overview"
      className="min-h-0 flex-1"
      onValueChange={(v) => {
        if (v === "events") setEventsVisible(true);
      }}
    >
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
        <TabsTrigger value="overview" className="text-xs">
          Overview
        </TabsTrigger>
        <TabsTrigger value="events" className="text-xs">
          Events
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0 min-h-0 flex-1">
        <PodOverviewTab pod={pod} onNavigateToPortForwarding={onNavigateToPortForwarding} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <PodEventsTab pod={pod} />}
      </TabsContent>
    </Tabs>
  );
};

export const PodDetailDrawer: FC<PodDetailDrawerProps> = ({
  podName,
  podNamespace,
  open,
  onClose,
  onNavigateToPortForwarding,
}) => {
  const { activeContext } = useMainLayoutContext();
  const { openTab } = useUnifiedTray();

  const [pod, setPod] = useState<Pod | undefined>(undefined);

  const toggleTray = (mode: "logs" | "exec") => {
    if (!pod) return;
    openTab("pod", {
      contextName: activeContext,
      ns: pod.Namespace,
      pod: pod.Name,
      containers: pod.ContainerDetails ?? [],
      mode,
      ownerKind: pod.ControlledBy || undefined,
      ownerName: pod.ControlledByName || undefined,
    });
  };

  const hasData = !!podName && !!podNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Pod: {pod?.Name ?? podName}</SheetTitle>
        {pod && (
          <PodDrawerCtaButtons
            onToggleTray={toggleTray}
            podName={pod.Name}
            podNs={pod.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <PodDrawerBody
          key={podName}
          podName={podName}
          podNamespace={podNamespace}
          open={open}
          onClose={onClose}
          onNavigateToPortForwarding={onNavigateToPortForwarding}
          onDataChange={setPod}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Pod" />
      )}
    </ResourceDetailDrawer>
  );
};
