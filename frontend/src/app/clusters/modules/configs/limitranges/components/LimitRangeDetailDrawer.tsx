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
import { FC, Fragment, useEffect, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { LimitRangeDetail } from "../api/resources";
import { useGetLimitRangeDetail } from "../hooks/data-access/useGetLimitRangeDetail";
import { useDeleteLimitRange } from "../hooks/data-mutation/useDeleteLimitRange";
import { LimitRangeDeleteConfirmationModal } from "./LimitRangeDeleteConfirmationModal";

const LimitRangeOverviewTab: FC<{ lr: LimitRangeDetail }> = ({ lr }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {lr.Age} ago ({lr.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{lr.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(lr.Namespace)}>
          {lr.Namespace}
        </ResourceLink>

        {Object.keys(lr.Labels ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Labels</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(lr.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {Object.keys(lr.Annotations ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Annotations</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(lr.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {["Container", "Pod", "PersistentVolumeClaim"].map((limitType) => {
          if (!lr.Limits?.[limitType]) return null;
          const label =
            limitType === "PersistentVolumeClaim" ? "PVC Limits" : `${limitType} Limits`;
          return (
            <Fragment key={limitType}>
              <span className="text-h3 self-start pt-1 text-muted-foreground">{label}</span>
              <div className="flex flex-col">
                {Object.entries(lr.Limits[limitType]).map(([resource, valueTypes]) => (
                  <div
                    key={resource}
                    className="flex items-start gap-3 border-b border-muted py-2 last:border-b-0"
                  >
                    <span className="text-caption w-32 shrink-0 whitespace-nowrap text-muted-foreground">
                      {resource}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {["Min", "Max", "Default", "DefaultRequest"].flatMap((vt) =>
                        valueTypes[vt]
                          ? [
                              <span
                                key={vt}
                                className="text-caption rounded-md bg-muted px-2 py-0.5 text-muted-foreground"
                              >
                                {vt === "DefaultRequest" ? "defaultRequest" : vt.toLowerCase()}:
                                {valueTypes[vt]}
                              </span>,
                            ]
                          : []
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Fragment>
          );
        })}
      </div>
    </ScrollArea>
  );
};

const LimitRangeEventsTab: FC<{ lr: LimitRangeDetail }> = ({ lr }) => {
  const { activeContext } = useMainLayoutContext();
  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [lr.Namespace],
  });
  const lrEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "limitrange" &&
      e.InvolvedObjectName === lr.Name &&
      e.Namespace === lr.Namespace
  );
  return (
    <ScrollArea className="h-full">
      <EventsTable events={lrEvents} />
    </ScrollArea>
  );
};

interface LimitRangeDrawerCtaButtonsProps {
  lrName: string;
  lrNamespace: string;
  onClose: () => void;
}

const LimitRangeDrawerCtaButtons: FC<LimitRangeDrawerCtaButtonsProps> = ({
  lrName,
  lrNamespace,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteLr, isPending: isDeletePending } = useDeleteLimitRange();

  const handleDeleteConfirm = () => {
    deleteLr(
      { namespace: lrNamespace, name: lrName },
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
          ariaLabel="Edit LimitRange"
          onClick={() =>
            openTab("modification", { kind: "LimitRange", name: lrName, namespace: lrNamespace })
          }
        />
        <ResourceDeletionButton
          mode="icon-button"
          ariaLabel="Delete LimitRange"
          disabled={isDeletePending}
          onClick={() => setShowDeleteModal(true)}
        />
      </ButtonGroup>

      <LimitRangeDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        lrName={lrName}
        lrNamespace={lrNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </TooltipProvider>
  );
};

interface LimitRangeDetailDrawerProps {
  lrName: string | null;
  lrNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const LimitRangeDrawerBody: FC<
  LimitRangeDetailDrawerProps & {
    lrName: string;
    lrNamespace: string;
    onDataChange: (lr: LimitRangeDetail | undefined) => void;
  }
> = ({ lrName, lrNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: lr, isLoading } = useGetLimitRangeDetail(activeContext, lrNamespace, lrName);
  useCatchForbiddenResource("limitranges", {
    open,
    resourceName: lrName,
    resourceLabel: "LimitRange",
    namespace: lrNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(lr);
  }, [lr, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!lr) {
    return <ResourceDetailEmptyBody resourceKind="LimitRange" />;
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
        <LimitRangeOverviewTab lr={lr} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <LimitRangeEventsTab lr={lr} />}
      </TabsContent>
    </Tabs>
  );
};

export const LimitRangeDetailDrawer: FC<LimitRangeDetailDrawerProps> = ({
  lrName,
  lrNamespace,
  open,
  onClose,
}) => {
  const [lr, setLr] = useState<LimitRangeDetail | undefined>(undefined);

  const hasData = !!(lrName && lrNamespace);

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Limit Range: {lr?.Name ?? lrName}</SheetTitle>
        {lr && (
          <LimitRangeDrawerCtaButtons
            lrName={lr.Name}
            lrNamespace={lr.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <LimitRangeDrawerBody
          key={`${lrNamespace}/${lrName}`}
          lrName={lrName}
          lrNamespace={lrNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setLr}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Limit Range" />
      )}
    </ResourceDetailDrawer>
  );
};
