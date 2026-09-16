import {
  AnnotationBadge,
  ButtonGroup,
  LoadingSpinner,
  ResourceDeletionButton,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceDetailEmptyBody,
  ResourceLink,
  ResourceModificationButton,
  ResourceScaleButton,
  ScrollArea,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TooltipProvider,
} from "@galacius/design-system";
import { FC, useEffect, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { useResourceLinks } from "../../../../shared/hooks/useResourceLinks";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import { PodSimpleTable } from "../../pods/components/PodSimpleTable";
import { useGetPods } from "../../pods/hooks/data-access/useGetPods";
import type { ReplicaSet } from "../api/resources";
import { useGetReplicaSetDetail } from "../hooks/data-access/useGetReplicaSetDetail";
import { useDeleteReplicaSet } from "../hooks/data-mutation/useDeleteReplicaSet";
import { useScaleReplicaSet } from "../hooks/data-mutation/useScaleReplicaSet";
import { ReplicaSetDeleteConfirmationModal } from "./ReplicaSetDeleteConfirmationModal";
import { ReplicaSetHealthBadge } from "./ReplicaSetHealthBadge";
import { ReplicaSetScaleModal } from "./ReplicaSetScaleModal";

const ReplicaSetDrawerCtaButtons: FC<{
  name: string;
  namespace: string;
  currentReplicas: number;
  isOwned: boolean;
  ownerKind: string;
  ownerName: string;
  onDeleted: () => void;
}> = ({ name, namespace, currentReplicas, isOwned, ownerKind, ownerName, onDeleted }) => {
  const { openTab } = useUnifiedTray();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [scaleKey, setScaleKey] = useState(0);

  const { mutate: deleteMutate, isPending: isDeletePending } = useDeleteReplicaSet();
  const { mutate: scaleMutate, isPending: isScalePending } = useScaleReplicaSet();

  return (
    <>
      <ButtonGroup>
        <TooltipProvider>
          <ResourceScaleButton
            mode="icon-button"
            ariaLabel="Scale ReplicaSet"
            disabled={isScalePending}
            isNotAllowed={isOwned}
            notAllowedReason={`Owned by ${ownerKind} ${ownerName} — scale the parent resource instead.`}
            onClick={() => setScaleOpen(true)}
          />
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit ReplicaSet"
            onClick={() => openTab("modification", { kind: "ReplicaSet", name, namespace })}
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete ReplicaSet"
            disabled={isScalePending || isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <ReplicaSetDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        namespace={namespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          deleteMutate({ namespace, name }, { onSuccess: () => onDeleted() });
        }}
      />

      <ReplicaSetScaleModal
        key={scaleKey}
        open={scaleOpen}
        name={name}
        currentReplicas={currentReplicas}
        isPending={isScalePending}
        onClose={() => {
          setScaleOpen(false);
          setScaleKey((k) => k + 1);
        }}
        onScale={(replicas) => {
          scaleMutate({ namespace, name, replicas });
          setScaleOpen(false);
          setScaleKey((k) => k + 1);
        }}
      />
    </>
  );
};

const ReplicaSetOverviewTab: FC<{ rs: ReplicaSet }> = ({ rs }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));
  const resourceLinks = useResourceLinks();
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {rs.Age} ago ({rs.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{rs.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(rs.Namespace)}>
          {rs.Namespace}
        </ResourceLink>

        {Object.keys(rs.Labels ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Labels</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(rs.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {Object.keys(rs.Annotations ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Annotations</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(rs.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {(rs.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {rs.ManagedFields.map((mf, i) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}/${i}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        {rs.OwnerKind && (
          <>
            <span className="text-h3 text-muted-foreground">Controlled By</span>
            <span className="text-body font-mono">
              {rs.OwnerKind}:{" "}
              {resourceLinks[rs.OwnerKind.toLowerCase()] ? (
                <ResourceLink
                  onClick={() =>
                    resourceLinks[rs.OwnerKind.toLowerCase()](rs.Namespace, rs.OwnerName)
                  }
                >
                  {rs.OwnerName}
                </ResourceLink>
              ) : (
                rs.OwnerName
              )}
            </span>
          </>
        )}

        {Object.keys(rs.Selector ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Selector</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(rs.Selector).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {Object.keys(rs.NodeSelector ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Node Selector</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(rs.NodeSelector).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {(rs.Images ?? []).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Images</span>
            <div className="flex flex-col gap-0.5">
              {rs.Images.map((img, i) => (
                <span key={`${img}-${i}`} className="text-body font-mono break-all">
                  {img}
                </span>
              ))}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Replicas</span>
        <span className="text-body font-mono">{rs.ReplicasDetail}</span>

        <span className="text-h3 text-muted-foreground">Tolerations</span>
        <span className="text-body font-mono">{rs.Tolerations}</span>

        <span className="text-h3 text-muted-foreground">Affinities</span>
        <span className="text-body font-mono">{rs.Affinities}</span>

        {rs.PodStatus && (
          <>
            <span className="text-h3 text-muted-foreground">Pod Status</span>
            <span className="text-body font-mono">{rs.PodStatus}</span>
          </>
        )}

        {rs.HealthStatus && (
          <>
            <span className="text-h3 text-muted-foreground">Health</span>
            <span>
              <ReplicaSetHealthBadge status={rs.HealthStatus} message={rs.HealthMessage} />
            </span>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

const ReplicaSetPodsTab: FC<{ rs: ReplicaSet }> = ({ rs }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: allPods = [] } = useGetPods({ context: activeContext, namespaces: [rs.Namespace] });
  const pods = allPods
    .filter(
      (p) =>
        p.ControlledBy === "ReplicaSet" &&
        p.ControlledByName === rs.Name &&
        p.Namespace === rs.Namespace
    )
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  return <PodSimpleTable pods={pods} />;
};

const ReplicaSetEventsTab: FC<{ rs: ReplicaSet }> = ({ rs }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [rs.Namespace],
  });
  const rsEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "replicaset" &&
      e.InvolvedObjectName === rs.Name &&
      e.Namespace === rs.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={rsEvents} />
    </ScrollArea>
  );
};

interface ReplicaSetDetailDrawerProps {
  rsName: string | null;
  rsNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const ReplicaSetDrawerBody: FC<
  ReplicaSetDetailDrawerProps & {
    rsName: string;
    rsNamespace: string;
    onDataChange: (rs: ReplicaSet | undefined) => void;
  }
> = ({ rsName, rsNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: rs, isLoading } = useGetReplicaSetDetail(activeContext, rsNamespace, rsName);
  useCatchForbiddenResource("replicasets", {
    open,
    resourceName: rsName,
    resourceLabel: "ReplicaSet",
    namespace: rsNamespace,
    onForbiddenDetected: onClose,
  });

  const [eventsVisible, setEventsVisible] = useState(false);

  useEffect(() => {
    onDataChange(rs);
  }, [rs, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!rs) {
    return <ResourceDetailEmptyBody resourceKind="ReplicaSet" />;
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
        <ReplicaSetOverviewTab rs={rs} />
      </TabsContent>
      <TabsContent value="pods" className="mt-0 min-h-0 flex-1">
        <ReplicaSetPodsTab rs={rs} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <ReplicaSetEventsTab rs={rs} />}
      </TabsContent>
    </Tabs>
  );
};

export const ReplicaSetDetailDrawer: FC<ReplicaSetDetailDrawerProps> = ({
  rsName,
  rsNamespace,
  open,
  onClose,
}) => {
  const [rs, setRs] = useState<ReplicaSet | undefined>(undefined);

  const hasData = !!rsName && !!rsNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">ReplicaSet: {rs?.Name ?? rsName}</SheetTitle>
        {rs && (
          <ReplicaSetDrawerCtaButtons
            name={rs.Name}
            namespace={rs.Namespace}
            currentReplicas={rs.Current}
            isOwned={rs.OwnerKind !== ""}
            ownerKind={rs.OwnerKind}
            ownerName={rs.OwnerName}
            onDeleted={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <ReplicaSetDrawerBody
          key={`${rsName}/${rsNamespace}`}
          rsName={rsName}
          rsNamespace={rsNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setRs}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="ReplicaSet" />
      )}
    </ResourceDetailDrawer>
  );
};
