import {
  AnnotationBadge,
  Badge,
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
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { PersistentVolumeDetail } from "../api/resources";
import { useGetPersistentVolumeByName } from "../hooks/data-access/useGetPersistentVolumeByName";
import { useDeletePersistentVolume } from "../hooks/data-mutation/useDeletePersistentVolume";
import { PersistentVolumeDeleteConfirmationModal } from "./PersistentVolumeDeleteConfirmationModal";
import { PersistentVolumeStatusBadge } from "./PersistentVolumeStatusBadge";

const PersistentVolumeOverviewTab: FC<{ pv: PersistentVolumeDetail }> = ({ pv }) => {
  const { onToggleStorageClassDetail, onTogglePersistentVolumeClaimDetail } =
    useDetailDrawerContext((v) => ({
      onToggleStorageClassDetail: v.onToggleStorageClassDetail,
      onTogglePersistentVolumeClaimDetail: v.onTogglePersistentVolumeClaimDetail,
    }));
  const { namespaces: activeNamespaces } = useMainLayoutContext();
  const [claimNamespace, claimName] = pv.Claim?.includes("/") ? pv.Claim.split("/") : [];
  const isClaimNamespaceActive =
    activeNamespaces.length === 0 || activeNamespaces.includes(claimNamespace ?? "");
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {pv.Age} ago ({pv.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{pv.Name}</span>

        <span className="text-h3 text-muted-foreground">Capacity</span>
        <span className="text-body">{pv.Capacity}</span>

        {pv.AccessModes.length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Access Modes</span>
            <div className="flex flex-wrap gap-1">
              {pv.AccessModes.map((mode) => (
                <Badge key={mode} variant="secondary" className="text-xs">
                  {mode}
                </Badge>
              ))}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Reclaim Policy</span>
        <Badge variant="ghost" className="w-fit">
          {pv.ReclaimPolicy}
        </Badge>

        <span className="text-h3 text-muted-foreground">Status</span>
        <PersistentVolumeStatusBadge status={pv.Status} />

        <span className="text-h3 text-muted-foreground">Storage Class</span>
        {pv.StorageClass ? (
          <ResourceLink onClick={() => onToggleStorageClassDetail(pv.StorageClass)}>
            {pv.StorageClass}
          </ResourceLink>
        ) : (
          <span className="text-body">—</span>
        )}

        <span className="text-h3 text-muted-foreground">Claim</span>
        {claimName &&
        claimNamespace &&
        pv.Status.toLowerCase() !== "released" &&
        isClaimNamespaceActive ? (
          <ResourceLink
            onClick={() => onTogglePersistentVolumeClaimDetail(claimNamespace, claimName)}
          >
            {pv.Claim}
          </ResourceLink>
        ) : (
          <span className="text-body">{pv.Claim}</span>
        )}

        <span className="text-h3 text-muted-foreground">Volume Mode</span>
        <span className="text-body">{pv.VolumeMode}</span>

        {pv.MountOptions.length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Mount Options</span>
            <div className="flex flex-wrap gap-1">
              {pv.MountOptions.map((opt) => (
                <Badge key={opt} variant="secondary" className="text-xs">
                  {opt}
                </Badge>
              ))}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Node Affinity</span>
        <span className="text-body">{pv.NodeAffinitySummary}</span>

        {Object.keys(pv.Labels ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Labels</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(pv.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {Object.keys(pv.Annotations ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Annotations</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(pv.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

const PersistentVolumeEventsTab: FC<{ pv: PersistentVolumeDetail }> = ({ pv }) => {
  const { activeContext } = useMainLayoutContext();
  const { data: events = [] } = useGetEvents({ context: activeContext, namespaces: [] });
  const pvEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "persistentvolume" && e.InvolvedObjectName === pv.Name
  );
  return (
    <ScrollArea className="h-full">
      <EventsTable events={pvEvents} />
    </ScrollArea>
  );
};

interface PersistentVolumeDrawerCtaButtonsProps {
  name: string;
  onDeleted: () => void;
}

const PersistentVolumeDrawerCtaButtons: FC<PersistentVolumeDrawerCtaButtonsProps> = ({
  name,
  onDeleted,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deletePersistentVolume, isPending: isDeletePending } =
    useDeletePersistentVolume();

  const handleDeleteConfirm = () => {
    deletePersistentVolume(
      { name },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onDeleted();
        },
      }
    );
  };

  return (
    <>
      <ButtonGroup>
        <TooltipProvider>
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit PersistentVolume"
            onClick={() => openTab("modification", { kind: "PersistentVolume", name })}
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete PersistentVolume"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <PersistentVolumeDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface PersistentVolumeDetailDrawerProps {
  name: string | null;
  open: boolean;
  onClose: () => void;
}

const PersistentVolumeDrawerBody: FC<
  PersistentVolumeDetailDrawerProps & {
    name: string;
    onDataChange: (pv: PersistentVolumeDetail | undefined) => void;
  }
> = ({ name, open, onClose, onDataChange }) => {
  const [eventsVisible, setEventsVisible] = useState(false);
  const { activeContext } = useMainLayoutContext();

  const { data: pv, isLoading } = useGetPersistentVolumeByName(activeContext, name);
  useCatchForbiddenResource("persistentvolumes", {
    open,
    resourceName: name,
    resourceLabel: "PersistentVolume",
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(pv);
  }, [pv, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!pv) {
    return <ResourceDetailEmptyBody resourceKind="PersistentVolume" />;
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
        <PersistentVolumeOverviewTab pv={pv} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <PersistentVolumeEventsTab pv={pv} />}
      </TabsContent>
    </Tabs>
  );
};

export const PersistentVolumeDetailDrawer: FC<PersistentVolumeDetailDrawerProps> = ({
  name,
  open,
  onClose,
}) => {
  const [pv, setPv] = useState<PersistentVolumeDetail | undefined>(undefined);

  const hasData = !!name;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Persistent Volume: {pv?.Name ?? name}</SheetTitle>
        {pv && <PersistentVolumeDrawerCtaButtons name={pv.Name} onDeleted={onClose} />}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <PersistentVolumeDrawerBody
          key={name}
          name={name}
          open={open}
          onClose={onClose}
          onDataChange={setPv}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Persistent Volume" />
      )}
    </ResourceDetailDrawer>
  );
};
