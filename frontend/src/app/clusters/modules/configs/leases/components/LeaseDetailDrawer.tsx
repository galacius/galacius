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
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { Lease } from "../api/resources";
import { useGetLeaseByName } from "../hooks/data-access/useGetLeaseByName";
import { useDeleteLease } from "../hooks/data-mutation/useDeleteLease";
import { LeaseDeleteConfirmationModal } from "./LeaseDeleteConfirmationModal";

const LeaseOverviewTab: FC<{ lease: Lease }> = ({ lease }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {lease.Age} ago ({lease.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{lease.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(lease.Namespace)}>
          {lease.Namespace}
        </ResourceLink>

        {Object.keys(lease.Labels ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Labels</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(lease.Labels ?? {}).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {(lease.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {lease.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Holder Identity</span>
        <span className="text-body font-mono">{lease.HolderIdentity || "—"}</span>

        <span className="text-h3 text-muted-foreground">Lease Duration (s)</span>
        <span className="text-body font-mono">{lease.LeaseDurationSeconds || "—"}</span>

        <span className="text-h3 text-muted-foreground">Renew Time</span>
        <span className="text-body font-mono">{lease.RenewTime || "—"}</span>
      </div>
    </ScrollArea>
  );
};

interface LeaseDrawerCtaButtonsProps {
  name: string;
  namespace: string;
  onClose: () => void;
}

const LeaseDrawerCtaButtons: FC<LeaseDrawerCtaButtonsProps> = ({ name, namespace, onClose }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteSingle, isPending: isDeletePending } = useDeleteLease();

  const handleConfirmDelete = () => {
    deleteSingle(
      { namespace, name },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onClose();
        },
      }
    );
  };

  return (
    <TooltipProvider>
      <ButtonGroup>
        <ResourceModificationButton
          mode="icon-button"
          ariaLabel="Edit Lease"
          onClick={() => openTab("modification", { kind: "Lease", name, namespace })}
        />
        <ResourceDeletionButton
          mode="icon-button"
          ariaLabel="Delete Lease"
          onClick={() => setShowDeleteModal(true)}
        />
      </ButtonGroup>

      <LeaseDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        namespace={namespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />
    </TooltipProvider>
  );
};

const LeaseEventsTab: FC<{ lease: Lease }> = ({ lease }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [lease.Namespace],
  });
  const leaseEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "lease" &&
      e.InvolvedObjectName === lease.Name &&
      e.Namespace === lease.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={leaseEvents} />
    </ScrollArea>
  );
};

interface LeaseDetailDrawerProps {
  leaseName: string | null;
  leaseNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const LeaseDrawerBody: FC<
  LeaseDetailDrawerProps & {
    leaseName: string;
    leaseNamespace: string;
    onDataChange: (lease: Lease | undefined) => void;
  }
> = ({ leaseName, leaseNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: lease, isLoading } = useGetLeaseByName(activeContext, leaseNamespace, leaseName);
  useCatchForbiddenResource("leases", {
    open,
    resourceName: leaseName,
    resourceLabel: "Lease",
    namespace: leaseNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(lease?.Name ? lease : undefined);
  }, [lease, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!lease?.Name) {
    return <ResourceDetailEmptyBody resourceKind="Lease" />;
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
        <LeaseOverviewTab lease={lease} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <LeaseEventsTab lease={lease} />}
      </TabsContent>
    </Tabs>
  );
};

export const LeaseDetailDrawer: FC<LeaseDetailDrawerProps> = ({
  leaseName,
  leaseNamespace,
  open,
  onClose,
}) => {
  const [lease, setLease] = useState<Lease | undefined>(undefined);

  const hasData = !!leaseName && !!leaseNamespace;
  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Lease: {lease?.Name ?? leaseName}</SheetTitle>
        {lease && (
          <LeaseDrawerCtaButtons name={lease.Name} namespace={lease.Namespace} onClose={onClose} />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <LeaseDrawerBody
          key={leaseName}
          leaseName={leaseName}
          leaseNamespace={leaseNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setLease}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Lease" />
      )}
    </ResourceDetailDrawer>
  );
};
