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
  ResourceRestartButton,
  ScrollArea,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@galacius/design-system";
import { FC, useEffect, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import { PodSimpleTable } from "../../pods/components/PodSimpleTable";
import { useGetPods } from "../../pods/hooks/data-access/useGetPods";
import type { DaemonSet } from "../api/resources";
import { useGetDaemonSetDetail } from "../hooks/data-access/useGetDaemonSetDetail";
import { useDeleteDaemonSet } from "../hooks/data-mutation/useDeleteDaemonSet";
import { useRestartDaemonSet } from "../hooks/data-mutation/useRestartDaemonSet";
import { DaemonSetDeleteConfirmationModal } from "./DaemonSetDeleteConfirmationModal";
import { DaemonSetRestartConfirmationModal } from "./DaemonSetRestartConfirmationModal";

const DaemonSetOverviewTab: FC<{ ds: DaemonSet }> = ({ ds }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {ds.Age} ago ({ds.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{ds.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(ds.Namespace)}>
          {ds.Namespace}
        </ResourceLink>

        {Object.keys(ds.Labels ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Labels</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(ds.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {Object.keys(ds.Annotations ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Annotations</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(ds.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {(ds.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {ds.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        {Object.keys(ds.Selector ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Selector</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(ds.Selector).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {Object.keys(ds.NodeSelector ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Node Selector</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(ds.NodeSelector).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {(ds.Images ?? []).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Images</span>
            <div className="flex flex-col gap-0.5">
              {ds.Images.map((img) => (
                <span key={img} className="text-body font-mono break-all">
                  {img}
                </span>
              ))}
            </div>
          </>
        )}

        {ds.StrategyType && (
          <>
            <span className="text-h3 text-muted-foreground">Strategy Type</span>
            <span className="text-body font-mono">{ds.StrategyType}</span>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Tolerations</span>
        <span className="text-body font-mono">{ds.Tolerations}</span>

        {ds.PodStatus && (
          <>
            <span className="text-h3 text-muted-foreground">Pod Status</span>
            <span className="text-body font-mono">{ds.PodStatus}</span>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

const DaemonSetPodsTab: FC<{ ds: DaemonSet }> = ({ ds }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: allPods = [] } = useGetPods({ context: activeContext, namespaces: [ds.Namespace] });
  const pods = allPods
    .filter(
      (p) =>
        p.ControlledBy === "DaemonSet" &&
        p.ControlledByName === ds.Name &&
        p.Namespace === ds.Namespace
    )
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  return <PodSimpleTable pods={pods} />;
};

const DaemonSetEventsTab: FC<{ ds: DaemonSet }> = ({ ds }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [ds.Namespace],
  });
  const dsEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "daemonset" &&
      e.InvolvedObjectName === ds.Name &&
      e.Namespace === ds.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={dsEvents} />
    </ScrollArea>
  );
};

const DaemonSetDrawerCtaButtons: FC<{
  namespace: string;
  name: string;
  onDeleted: () => void;
}> = ({ namespace, name, onDeleted }) => {
  const { openTab } = useUnifiedTray();

  const { mutate: restartMutate, isPending: isRestartPending } = useRestartDaemonSet();
  const { mutate: deleteMutate, isPending: isDeletePending } = useDeleteDaemonSet();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <ButtonGroup>
        <ResourceRestartButton
          mode="icon-button"
          ariaLabel="Restart DaemonSet"
          disabled={isRestartPending || isDeletePending}
          onClick={() => setConfirmOpen(true)}
        />
        <ResourceModificationButton
          mode="icon-button"
          ariaLabel="Edit DaemonSet"
          onClick={() => openTab("modification", { kind: "DaemonSet", name, namespace })}
        />
        <ResourceDeletionButton
          mode="icon-button"
          ariaLabel="Delete DaemonSet"
          disabled={isRestartPending || isDeletePending}
          onClick={() => setShowDeleteModal(true)}
        />
      </ButtonGroup>

      <DaemonSetRestartConfirmationModal
        open={confirmOpen}
        name={name}
        isPending={isRestartPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          restartMutate({ namespace, name });
          setConfirmOpen(false);
        }}
      />

      <DaemonSetDeleteConfirmationModal
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

interface DaemonSetDetailDrawerProps {
  dsName: string | null;
  dsNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const DaemonSetDrawerBody: FC<
  DaemonSetDetailDrawerProps & {
    dsName: string;
    dsNamespace: string;
    onDataChange: (ds: DaemonSet | undefined) => void;
  }
> = ({ dsName, dsNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: ds, isLoading } = useGetDaemonSetDetail(activeContext, dsNamespace, dsName);
  useCatchForbiddenResource("daemonsets", {
    open,
    resourceName: dsName,
    resourceLabel: "DaemonSet",
    namespace: dsNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(ds);
  }, [ds, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!ds) {
    return <ResourceDetailEmptyBody resourceKind="DaemonSet" />;
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
        <DaemonSetOverviewTab ds={ds} />
      </TabsContent>
      <TabsContent value="pods" className="mt-0 min-h-0 flex-1">
        <DaemonSetPodsTab ds={ds} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <DaemonSetEventsTab ds={ds} />}
      </TabsContent>
    </Tabs>
  );
};

export const DaemonSetDetailDrawer: FC<DaemonSetDetailDrawerProps> = ({
  dsName,
  dsNamespace,
  open,
  onClose,
}) => {
  const [ds, setDs] = useState<DaemonSet | undefined>(undefined);

  const hasData = !!dsName && !!dsNamespace;
  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">DaemonSet: {ds?.Name ?? dsName}</SheetTitle>
        {ds && (
          <DaemonSetDrawerCtaButtons namespace={ds.Namespace} name={ds.Name} onDeleted={onClose} />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <DaemonSetDrawerBody
          key={dsName}
          dsName={dsName}
          dsNamespace={dsNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setDs}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="DaemonSet" />
      )}
    </ResourceDetailDrawer>
  );
};
