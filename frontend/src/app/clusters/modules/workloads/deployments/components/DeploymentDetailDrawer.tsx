import {
  AnnotationBadge,
  Button,
  ButtonGroup,
  ChevronDownIcon,
  ChevronUpIcon,
  LoadingSpinner,
  ResourceDeletionButton,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceDetailEmptyBody,
  ResourceLink,
  ResourceModificationButton,
  ResourceRestartButton,
  ResourceScaleButton,
  ScrollArea,
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
  Textarea,
  TooltipProvider,
} from "@galacius/design-system";
import { FC, useEffect, useMemo, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import { PodSimpleTable } from "../../pods/components/PodSimpleTable";
import { useGetPods } from "../../pods/hooks/data-access/useGetPods";
import { useGetReplicaSets } from "../../replicasets/hooks/data-access/useGetReplicaSets";
import type { Deployment } from "../api/resources";
import { useGetDeploymentDetail } from "../hooks/data-access/useGetDeploymentDetail";
import { useDeleteDeployment } from "../hooks/data-mutation/useDeleteDeployment";
import { useRestartDeployment } from "../hooks/data-mutation/useRestartDeployment";
import { useScaleDeployment } from "../hooks/data-mutation/useScaleDeployment";
import { DeploymentConditionBadge } from "./DeploymentConditionBadge";
import { DeploymentDeleteConfirmationModal } from "./DeploymentDeleteConfirmationModal";
import { DeploymentRestartConfirmationModal } from "./DeploymentRestartConfirmationModal";
import { DeploymentScaleModal } from "./DeploymentScaleModal";
import { DeploymentStrategyBadge } from "./DeploymentStrategyBadge";

const DeploymentTolerationsField: FC<{ deployment: Deployment }> = ({ deployment }) => {
  const [showTolerations, setShowTolerations] = useState(false);

  return (
    <>
      <span className="text-h3 text-muted-foreground">Tolerations</span>
      <div className="flex items-center justify-between">
        <span className="text-body font-mono">{deployment.Tolerations}</span>
        {deployment.Tolerations > 0 && (
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
              {(deployment.TolerationDetails ?? []).map((t) => (
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
    </>
  );
};

const DeploymentAffinitiesField: FC<{ deployment: Deployment }> = ({ deployment }) => {
  const [showAffinities, setShowAffinities] = useState(false);

  if (deployment.AffinityCount <= 0) return null;

  return (
    <>
      <span className="text-h3 text-muted-foreground">Affinities</span>
      <div className="flex items-center justify-between">
        <span className="text-body font-mono">{deployment.AffinityCount}</span>
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
        <Textarea variant="code" disabled value={deployment.Affinities} className="col-span-2" />
      )}
    </>
  );
};

const DeploymentReplicaSetsSection: FC<{ deployment: Deployment }> = ({ deployment }) => {
  const { activeContext } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleReplicaSetDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleReplicaSetDetail: v.onToggleReplicaSetDetail,
  }));

  const { data: allRS = [] } = useGetReplicaSets({
    context: activeContext,
    namespaces: [deployment.Namespace],
  });
  const replicaSets = useMemo(
    () =>
      allRS.filter(
        (rs) => rs.OwnerName === deployment.Name && rs.Namespace === deployment.Namespace
      ),
    [allRS, deployment.Name, deployment.Namespace]
  );

  if (replicaSets.length === 0) return null;

  return (
    <>
      <Separator />
      <SectionDivider
        label="Deploy Revisions"
        className="border-y-0 bg-muted/50 tracking-wide uppercase"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs">Namespace</TableHead>
            <TableHead className="text-xs">Pods</TableHead>
            <TableHead className="text-xs">Age</TableHead>
            <TableHead className="text-xs">Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {replicaSets
            .toSorted((a, b) => b.CreatedAt.localeCompare(a.CreatedAt))
            .map((rs) => (
              <TableRow key={`${rs.Namespace}/${rs.Name}`}>
                <TableCell className="max-w-40 font-mono text-xs">
                  <ResourceLink
                    truncate
                    truncateTextClassName="max-w-40"
                    onClick={() => onToggleReplicaSetDetail(rs.Namespace, rs.Name)}
                  >
                    {rs.Name}
                  </ResourceLink>
                </TableCell>
                <TableCell className="text-xs">
                  <ResourceLink onClick={() => onToggleNamespaceDetail(rs.Namespace)}>
                    {rs.Namespace}
                  </ResourceLink>
                </TableCell>
                <TableCell className="text-xs">
                  {rs.Ready}/{rs.Desired}
                </TableCell>
                <TableCell className="text-xs">{rs.Age}</TableCell>
                <TableCell className="font-mono text-xs">{rs.CreatedAt}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </>
  );
};

const DeploymentOverviewTab: FC<{ deployment: Deployment }> = ({ deployment }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-0">
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
          <span className="text-h3 text-muted-foreground">Created</span>
          <span className="text-body font-mono">
            {deployment.Age} ago ({deployment.CreatedAt})
          </span>

          <span className="text-h3 text-muted-foreground">Name</span>
          <span className="text-body font-mono">{deployment.Name}</span>

          <span className="text-h3 text-muted-foreground">Namespace</span>
          <ResourceLink onClick={() => onToggleNamespaceDetail(deployment.Namespace)}>
            {deployment.Namespace}
          </ResourceLink>

          {Object.keys(deployment.Labels ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Labels</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(deployment.Labels).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {Object.keys(deployment.Annotations ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Annotations</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(deployment.Annotations).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {(deployment.ManagedFields ?? []).length > 0 && (
            <>
              <span className="text-h3 self-start pt-0.5 text-muted-foreground">
                Managed Fields
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                {deployment.ManagedFields.map((mf) => (
                  <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
                ))}
              </div>
            </>
          )}

          <span className="text-h3 text-muted-foreground">Replicas</span>
          <span className="text-body font-mono">{deployment.ReplicasDetail}</span>

          {Object.keys(deployment.Selector ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Selector</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(deployment.Selector).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {Object.keys(deployment.NodeSelector ?? {}).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Node Selector</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(deployment.NodeSelector).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {deployment.StrategyType && (
            <>
              <span className="text-h3 text-muted-foreground">Strategy Type</span>
              <DeploymentStrategyBadge deployment={deployment} />
            </>
          )}

          {(deployment.Conditions ?? []).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Conditions</span>
              <div className="flex flex-wrap gap-1">
                {deployment.Conditions.map((c) => (
                  <DeploymentConditionBadge key={c.Type} condition={c} />
                ))}
              </div>
            </>
          )}

          <DeploymentTolerationsField deployment={deployment} />
          <DeploymentAffinitiesField deployment={deployment} />
        </div>

        <DeploymentReplicaSetsSection deployment={deployment} />
      </div>
    </ScrollArea>
  );
};

const DeploymentPodsTab: FC<{ deployment: Deployment }> = ({ deployment }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: allRS = [] } = useGetReplicaSets({
    context: activeContext,
    namespaces: [deployment.Namespace],
  });
  const rsNames = useMemo(
    () =>
      allRS.reduce((acc, rs) => {
        if (rs.OwnerName === deployment.Name && rs.Namespace === deployment.Namespace)
          acc.add(rs.Name);
        return acc;
      }, new Set<string>()),
    [allRS, deployment.Name, deployment.Namespace]
  );

  const { data: allPods = [] } = useGetPods({
    context: activeContext,
    namespaces: [deployment.Namespace],
  });
  const pods = useMemo(
    () =>
      allPods
        .filter(
          (p) =>
            p.ControlledBy === "ReplicaSet" && p.ControlledByName && rsNames.has(p.ControlledByName)
        )
        .toSorted((a, b) => a.Name.localeCompare(b.Name)),
    [allPods, rsNames]
  );

  return <PodSimpleTable pods={pods} />;
};

const DeploymentEventsTab: FC<{ deployment: Deployment }> = ({ deployment }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [deployment.Namespace],
  });
  const depEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "deployment" &&
      e.InvolvedObjectName === deployment.Name &&
      e.Namespace === deployment.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={depEvents} />
    </ScrollArea>
  );
};

const DeploymentDrawerCtaButtons: FC<{
  namespace: string;
  name: string;
  currentReplicas: number;
  onDeleted: () => void;
}> = ({ namespace, name, currentReplicas, onDeleted }) => {
  const { openTab } = useUnifiedTray();

  const { mutate, isPending } = useRestartDeployment();
  const { mutate: scaleMutate, isPending: isScalePending } = useScaleDeployment();
  const { mutate: deleteMutate, isPending: isDeletePending } = useDeleteDeployment();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [scaleKey, setScaleKey] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <ButtonGroup>
        <TooltipProvider>
          <ResourceScaleButton
            mode="icon-button"
            ariaLabel="Scale Deployment"
            disabled={isPending || isScalePending || isDeletePending}
            onClick={() => {
              setScaleKey((k) => k + 1);
              setScaleOpen(true);
            }}
          />
          <ResourceRestartButton
            mode="icon-button"
            ariaLabel="Restart Deployment"
            disabled={isPending || isScalePending || isDeletePending}
            onClick={() => setConfirmOpen(true)}
          />
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit Deployment"
            disabled={isPending || isScalePending || isDeletePending}
            onClick={() => openTab("modification", { kind: "Deployment", name, namespace })}
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete Deployment"
            disabled={isPending || isScalePending || isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <DeploymentScaleModal
        key={scaleKey}
        open={scaleOpen}
        name={name}
        currentReplicas={currentReplicas}
        isPending={isScalePending}
        onClose={() => setScaleOpen(false)}
        onScale={(replicas) => {
          scaleMutate({ namespace, name, replicas });
          setScaleOpen(false);
        }}
      />

      <DeploymentRestartConfirmationModal
        open={confirmOpen}
        name={name}
        isPending={isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          mutate({ namespace, name });
          setConfirmOpen(false);
        }}
      />

      <DeploymentDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        namespace={namespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() =>
          deleteMutate(
            { namespace, name },
            {
              onSuccess: () => {
                setShowDeleteModal(false);
                onDeleted();
              },
            }
          )
        }
      />
    </>
  );
};

interface DeploymentDetailDrawerProps {
  deploymentName: string | null;
  deploymentNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const DeploymentDrawerBody: FC<
  DeploymentDetailDrawerProps & {
    deploymentName: string;
    deploymentNamespace: string;
    onDataChange: (deployment: Deployment | undefined) => void;
  }
> = ({ deploymentName, deploymentNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: deployment, isLoading } = useGetDeploymentDetail(
    activeContext,
    deploymentNamespace,
    deploymentName
  );
  useCatchForbiddenResource("deployments", {
    open,
    resourceName: deploymentName,
    resourceLabel: "Deployment",
    namespace: deploymentNamespace,
    onForbiddenDetected: onClose,
  });

  const [eventsVisible, setEventsVisible] = useState(false);

  useEffect(() => {
    onDataChange(deployment);
  }, [deployment, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!deployment) {
    return <ResourceDetailEmptyBody resourceKind="Deployment" />;
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
        <TabsTrigger value="pods" className="text-xs">
          Pods
        </TabsTrigger>
        <TabsTrigger value="events" className="text-xs">
          Events
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0 min-h-0 flex-1">
        <DeploymentOverviewTab deployment={deployment} />
      </TabsContent>
      <TabsContent value="pods" className="mt-0 min-h-0 flex-1">
        <DeploymentPodsTab deployment={deployment} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <DeploymentEventsTab deployment={deployment} />}
      </TabsContent>
    </Tabs>
  );
};

export const DeploymentDetailDrawer: FC<DeploymentDetailDrawerProps> = ({
  deploymentName,
  deploymentNamespace,
  open,
  onClose,
}) => {
  const [deployment, setDeployment] = useState<Deployment | undefined>(undefined);

  const hasData = !!deploymentName && !!deploymentNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">
          Deployment: {deployment?.Name ?? deploymentName}
        </SheetTitle>
        {deployment && (
          <DeploymentDrawerCtaButtons
            namespace={deployment.Namespace}
            name={deployment.Name}
            currentReplicas={deployment.Replicas}
            onDeleted={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <DeploymentDrawerBody
          key={deploymentName}
          deploymentName={deploymentName}
          deploymentNamespace={deploymentNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setDeployment}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Deployment" />
      )}
    </ResourceDetailDrawer>
  );
};
