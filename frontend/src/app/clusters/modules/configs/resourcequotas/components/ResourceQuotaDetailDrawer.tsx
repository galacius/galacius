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
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { ResourceQuotaDetail } from "../api/resources";
import { useGetResourceQuotaDetail } from "../hooks/data-access/useGetResourceQuotaDetail";
import { useDeleteResourceQuota } from "../hooks/data-mutation/useDeleteResourceQuota";
import { ResourceQuotaDeleteConfirmationModal } from "./ResourceQuotaDeleteConfirmationModal";

const ResourceQuotaOverviewTab: FC<{ rq: ResourceQuotaDetail }> = ({ rq }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  const quotaEntries = Object.entries(rq.Hard).sort(([a], [b]) => a.localeCompare(b));

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {rq.Age} ago ({rq.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{rq.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(rq.Namespace)}>
          {rq.Namespace}
        </ResourceLink>

        {Object.keys(rq.Labels ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Labels</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(rq.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {Object.keys(rq.Annotations ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Annotations</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(rq.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {quotaEntries.length > 0 && (
          <>
            <span className="text-h3 self-start pt-1 text-muted-foreground">Quotas</span>
            <div className="flex flex-col gap-2">
              {quotaEntries.map(([resource, hard]) => {
                const used = rq.Used?.[resource] ?? "0";
                const hardNum = Number.parseFloat(hard);
                const usedNum = Number.parseFloat(used);
                const pct =
                  hardNum > 0 && !Number.isNaN(usedNum)
                    ? Math.min(100, (usedNum / hardNum) * 100)
                    : 0;
                return (
                  <div key={resource}>
                    <div className="flex items-center justify-between">
                      <span className="text-body">{resource}</span>
                      <span className="text-caption text-muted-foreground">
                        {used} / {hard}
                      </span>
                    </div>
                    <div className="mt-1 h-0.5 w-full rounded-full bg-muted">
                      <div className="h-0.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

const ResourceQuotaEventsTab: FC<{ rq: ResourceQuotaDetail }> = ({ rq }) => {
  const { activeContext } = useMainLayoutContext();
  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [rq.Namespace],
  });
  const rqEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "resourcequota" &&
      e.InvolvedObjectName === rq.Name &&
      e.Namespace === rq.Namespace
  );
  return (
    <ScrollArea className="h-full">
      <EventsTable events={rqEvents} />
    </ScrollArea>
  );
};

interface ResourceQuotaDrawerCtaButtonsProps {
  rqName: string;
  rqNamespace: string;
  onClose: () => void;
}

const ResourceQuotaDrawerCtaButtons: FC<ResourceQuotaDrawerCtaButtonsProps> = ({
  rqName,
  rqNamespace,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteQuota, isPending: isDeletePending } = useDeleteResourceQuota();

  const handleDeleteConfirm = () => {
    deleteQuota(
      { namespace: rqNamespace, name: rqName },
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
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit ResourceQuota"
            onClick={() =>
              openTab("modification", {
                kind: "ResourceQuota",
                name: rqName,
                namespace: rqNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete ResourceQuota"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <ResourceQuotaDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={rqName}
        namespace={rqNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface ResourceQuotaDetailDrawerProps {
  rqName: string | null;
  rqNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const ResourceQuotaDrawerBody: FC<
  ResourceQuotaDetailDrawerProps & {
    rqName: string;
    rqNamespace: string;
    onDataChange: (rq: ResourceQuotaDetail | undefined) => void;
  }
> = ({ rqName, rqNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: rq, isLoading } = useGetResourceQuotaDetail(activeContext, rqNamespace, rqName);
  useCatchForbiddenResource("resourcequotas", {
    open,
    resourceName: rqName,
    resourceLabel: "ResourceQuota",
    namespace: rqNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(rq);
  }, [rq, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!rq) {
    return <ResourceDetailEmptyBody resourceKind="ResourceQuota" />;
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
        <ResourceQuotaOverviewTab rq={rq} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <ResourceQuotaEventsTab rq={rq} />}
      </TabsContent>
    </Tabs>
  );
};

export const ResourceQuotaDetailDrawer: FC<ResourceQuotaDetailDrawerProps> = ({
  rqName,
  rqNamespace,
  open,
  onClose,
}) => {
  const [rq, setRq] = useState<ResourceQuotaDetail | undefined>(undefined);

  const hasData = !!(rqName && rqNamespace);

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Resource Quota: {rq?.Name ?? rqName}</SheetTitle>
        {rq && (
          <ResourceQuotaDrawerCtaButtons
            rqName={rq.Name}
            rqNamespace={rq.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <ResourceQuotaDrawerBody
          key={`${rqNamespace}/${rqName}`}
          rqName={rqName!}
          rqNamespace={rqNamespace!}
          open={open}
          onClose={onClose}
          onDataChange={setRq}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Resource Quota" />
      )}
    </ResourceDetailDrawer>
  );
};
