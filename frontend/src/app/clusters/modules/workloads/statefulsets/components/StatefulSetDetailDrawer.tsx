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
import { PodSimpleTable } from "../../pods/components/PodSimpleTable";
import { useGetPods } from "../../pods/hooks/data-access/useGetPods";
import type { StatefulSet } from "../api/resources";
import { useGetStatefulSetDetail } from "../hooks/data-access/useGetStatefulSetDetail";
import { useDeleteStatefulSet } from "../hooks/data-mutation/useDeleteStatefulSet";
import { StatefulSetDeleteConfirmationModal } from "./StatefulSetDeleteConfirmationModal";
import { StatefulSetHealthBadge } from "./StatefulSetHealthBadge";

const StatefulSetOverviewTab: FC<{ ss: StatefulSet }> = ({ ss }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {ss.Age} ago ({ss.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{ss.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(ss.Namespace)}>
          {ss.Namespace}
        </ResourceLink>

        {Object.keys(ss.Labels ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Labels</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(ss.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {Object.keys(ss.Annotations ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Annotations</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(ss.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {(ss.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {ss.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        {Object.keys(ss.Selector ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Selector</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(ss.Selector).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {(ss.Images ?? []).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Images</span>
            <div className="flex flex-col gap-0.5">
              {ss.Images.map((img) => (
                <span key={img} className="text-body font-mono break-all">
                  {img}
                </span>
              ))}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Affinities</span>
        <span className="text-body font-mono">{ss.Affinities}</span>

        {ss.PodStatus && (
          <>
            <span className="text-h3 text-muted-foreground">Pod Status</span>
            <span className="text-body font-mono">{ss.PodStatus}</span>
          </>
        )}

        {ss.HealthStatus && (
          <>
            <span className="text-h3 text-muted-foreground">Health</span>
            <span>
              <StatefulSetHealthBadge status={ss.HealthStatus} message={ss.HealthMessage} />
            </span>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

const StatefulSetPodsTab: FC<{ ss: StatefulSet }> = ({ ss }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: allPods = [] } = useGetPods({ context: activeContext, namespaces: [ss.Namespace] });
  const pods = allPods
    .filter(
      (p) =>
        p.ControlledBy === "StatefulSet" &&
        p.ControlledByName === ss.Name &&
        p.Namespace === ss.Namespace
    )
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  return <PodSimpleTable pods={pods} />;
};

const StatefulSetEventsTab: FC<{ ss: StatefulSet }> = ({ ss }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [ss.Namespace],
  });
  const ssEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "statefulset" &&
      e.InvolvedObjectName === ss.Name &&
      e.Namespace === ss.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={ssEvents} />
    </ScrollArea>
  );
};

interface StatefulSetDrawerCtaButtonsProps {
  statefulSetName: string;
  statefulSetNamespace: string;
  onClose: () => void;
}

const StatefulSetDrawerCtaButtons: FC<StatefulSetDrawerCtaButtonsProps> = ({
  statefulSetName,
  statefulSetNamespace,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteStatefulSet, isPending: isDeletePending } = useDeleteStatefulSet();

  const handleDeleteConfirm = () => {
    deleteStatefulSet(
      { namespace: statefulSetNamespace, name: statefulSetName },
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
            ariaLabel="Edit StatefulSet"
            onClick={() =>
              openTab("modification", {
                kind: "StatefulSet",
                name: statefulSetName,
                namespace: statefulSetNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete StatefulSet"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <StatefulSetDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={statefulSetName}
        namespace={statefulSetNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface StatefulSetDetailDrawerProps {
  statefulSetName: string | null;
  statefulSetNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const StatefulSetDrawerBody: FC<
  StatefulSetDetailDrawerProps & {
    statefulSetName: string;
    statefulSetNamespace: string;
    onDataChange: (ss: StatefulSet | undefined) => void;
  }
> = ({ statefulSetName, statefulSetNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: ss, isLoading } = useGetStatefulSetDetail(
    activeContext,
    statefulSetNamespace,
    statefulSetName
  );
  useCatchForbiddenResource("statefulsets", {
    open,
    resourceName: statefulSetName,
    resourceLabel: "StatefulSet",
    namespace: statefulSetNamespace,
    onForbiddenDetected: onClose,
  });

  const [eventsVisible, setEventsVisible] = useState(false);

  useEffect(() => {
    onDataChange(ss);
  }, [ss, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!ss) {
    return <ResourceDetailEmptyBody resourceKind="StatefulSet" />;
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
        <StatefulSetOverviewTab ss={ss} />
      </TabsContent>
      <TabsContent value="pods" className="mt-0 min-h-0 flex-1">
        <StatefulSetPodsTab ss={ss} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <StatefulSetEventsTab ss={ss} />}
      </TabsContent>
    </Tabs>
  );
};

export const StatefulSetDetailDrawer: FC<StatefulSetDetailDrawerProps> = ({
  statefulSetName,
  statefulSetNamespace,
  open,
  onClose,
}) => {
  const [ss, setSs] = useState<StatefulSet | undefined>(undefined);

  const hasData = !!statefulSetName && !!statefulSetNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">StatefulSet: {ss?.Name ?? statefulSetName}</SheetTitle>
        {ss && (
          <StatefulSetDrawerCtaButtons
            statefulSetName={ss.Name}
            statefulSetNamespace={ss.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <StatefulSetDrawerBody
          key={statefulSetName}
          statefulSetName={statefulSetName}
          statefulSetNamespace={statefulSetNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setSs}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="StatefulSet" />
      )}
    </ResourceDetailDrawer>
  );
};
