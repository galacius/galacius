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
  Separator,
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
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { PersistentVolumeClaimDetail } from "../api/resources";
import { useGetPersistentVolumeClaimDetail } from "../hooks/data-access/useGetPersistentVolumeClaimDetail";
import { useDeletePersistentVolumeClaim } from "../hooks/data-mutation/useDeletePersistentVolumeClaim";
import { PersistentVolumeClaimDeleteConfirmationModal } from "./PersistentVolumeClaimDeleteConfirmationModal";
import { PersistentVolumeClaimStatusBadge } from "./PersistentVolumeClaimStatusBadge";

interface PVCDrawerCtaButtonsProps {
  name: string;
  namespace: string;
  onDeleted: () => void;
}

const PVCDrawerCtaButtons: FC<PVCDrawerCtaButtonsProps> = ({ name, namespace, onDeleted }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deletePersistentVolumeClaim, isPending: isDeletePending } =
    useDeletePersistentVolumeClaim();

  const handleDeleteConfirm = () => {
    deletePersistentVolumeClaim(
      { namespace, name },
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
            ariaLabel="Edit PersistentVolumeClaim"
            onClick={() =>
              openTab("modification", { kind: "PersistentVolumeClaim", name, namespace })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete PersistentVolumeClaim"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <PersistentVolumeClaimDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        namespace={namespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

const PVCOverviewTab: FC<{ pvc: PersistentVolumeClaimDetail }> = ({ pvc }) => {
  const { onToggleNamespaceDetail, onTogglePodDetail, onToggleStorageClassDetail } =
    useDetailDrawerContext((v) => ({
      onToggleNamespaceDetail: v.onToggleNamespaceDetail,
      onTogglePodDetail: v.onTogglePodDetail,
      onToggleStorageClassDetail: v.onToggleStorageClassDetail,
    }));

  const hasLabels = Object.keys(pvc.Labels ?? {}).length > 0;
  const hasAnnotations = Object.keys(pvc.Annotations ?? {}).length > 0;
  const hasFinalizers = (pvc.Finalizers ?? []).length > 0;
  const hasMatchLabels = Object.keys(pvc.MatchLabels ?? {}).length > 0;
  const hasMatchExprs = (pvc.MatchExprs ?? []).length > 0;

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {pvc.Age} ago ({pvc.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{pvc.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(pvc.Namespace)}>
          {pvc.Namespace}
        </ResourceLink>

        {hasLabels && (
          <>
            <span className="text-h3 text-muted-foreground">Labels</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(pvc.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {hasAnnotations && (
          <>
            <span className="text-h3 text-muted-foreground">Annotations</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(pvc.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {hasFinalizers && (
          <>
            <span className="text-h3 text-muted-foreground">Finalizers</span>
            <div className="flex flex-wrap gap-1">
              {pvc.Finalizers.map((f) => (
                <AnnotationBadge key={f} label={f} />
              ))}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Access Modes</span>
        <span className="text-body font-mono">
          {(pvc.AccessModes ?? []).length > 0 ? pvc.AccessModes.join(", ") : "—"}
        </span>

        <span className="text-h3 text-muted-foreground">Storage Class</span>
        {pvc.StorageClass ? (
          <ResourceLink onClick={() => onToggleStorageClassDetail(pvc.StorageClass)}>
            {pvc.StorageClass}
          </ResourceLink>
        ) : (
          <span className="text-body font-mono">—</span>
        )}

        <span className="text-h3 text-muted-foreground">Storage</span>
        <span className="text-body font-mono">{pvc.Size || "—"}</span>

        <span className="text-h3 text-muted-foreground">Pods</span>
        <span className="text-body font-mono">
          {(pvc.Pods ?? []).length > 0 ? (
            <div className="flex flex-col gap-1">
              {pvc.Pods.map((pod) => (
                <ResourceLink key={pod} onClick={() => onTogglePodDetail(pvc.Namespace, pod)}>
                  {pod}
                </ResourceLink>
              ))}
            </div>
          ) : (
            "—"
          )}
        </span>

        <span className="text-h3 text-muted-foreground">Status</span>
        <PersistentVolumeClaimStatusBadge status={pvc.Status} />
      </div>

      <Separator />
      <SectionDivider label="Selector" className="border-y-0 bg-muted/50 tracking-wide uppercase" />
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Match Labels</span>
        {hasMatchLabels ? (
          <div className="flex flex-wrap gap-1">
            {Object.entries(pvc.MatchLabels).map(([k, v]) => (
              <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}

        <span className="text-h3 text-muted-foreground">Match Expressions</span>
        {hasMatchExprs ? (
          <div className="flex flex-col gap-1">
            {pvc.MatchExprs.map((expr) => (
              <span key={expr} className="text-body font-mono">
                {expr}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    </ScrollArea>
  );
};

const PVCEventsTab: FC<{ pvc: PersistentVolumeClaimDetail }> = ({ pvc }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [pvc.Namespace],
  });
  const pvcEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "persistentvolumeclaim" &&
      e.InvolvedObjectName === pvc.Name &&
      e.Namespace === pvc.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={pvcEvents} />
    </ScrollArea>
  );
};

interface PVCDetailDrawerProps {
  pvcName: string | null;
  pvcNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const PVCDrawerBody: FC<
  PVCDetailDrawerProps & {
    pvcName: string;
    pvcNamespace: string;
    onDataChange: (pvc: PersistentVolumeClaimDetail | undefined) => void;
  }
> = ({ pvcName, pvcNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: pvc, isLoading } = useGetPersistentVolumeClaimDetail(
    activeContext,
    pvcNamespace,
    pvcName
  );
  useCatchForbiddenResource("persistentvolumeclaims", {
    open,
    resourceName: pvcName,
    resourceLabel: "PersistentVolumeClaim",
    namespace: pvcNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(pvc);
  }, [pvc, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!pvc) {
    return <ResourceDetailEmptyBody resourceKind="PersistentVolumeClaim" />;
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
        <PVCOverviewTab pvc={pvc} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <PVCEventsTab pvc={pvc} />}
      </TabsContent>
    </Tabs>
  );
};

export const PersistentVolumeClaimDetailDrawer: FC<PVCDetailDrawerProps> = ({
  pvcName,
  pvcNamespace,
  open,
  onClose,
}) => {
  const [pvc, setPvc] = useState<PersistentVolumeClaimDetail | undefined>(undefined);

  const hasData = !!(pvcName && pvcNamespace);

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Persistent Volume Claim: {pvc?.Name ?? pvcName}</SheetTitle>
        {pvc && (
          <PVCDrawerCtaButtons name={pvc.Name} namespace={pvc.Namespace} onDeleted={onClose} />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <PVCDrawerBody
          key={`${pvcNamespace}/${pvcName}`}
          pvcName={pvcName!}
          pvcNamespace={pvcNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setPvc}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Persistent Volume Claim" />
      )}
    </ResourceDetailDrawer>
  );
};
