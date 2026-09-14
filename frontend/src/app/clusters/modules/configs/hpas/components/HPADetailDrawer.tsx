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
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { HPADetail } from "../api/resources";
import { useGetHPADetail } from "../hooks/data-access/useGetHPADetail";
import { useDeleteHPA } from "../hooks/data-mutation/useDeleteHPA";
import { HPADeleteConfirmationModal } from "./HPADeleteConfirmationModal";
import { HPAStatusBadge } from "./HPAStatusBadge";

interface HPADrawerCtaButtonsProps {
  hpaName: string;
  hpaNamespace: string;
  onClose: () => void;
}

const HPADrawerCtaButtons: FC<HPADrawerCtaButtonsProps> = ({ hpaName, hpaNamespace, onClose }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteHPA, isPending: isDeletePending } = useDeleteHPA();

  const handleDeleteConfirm = () => {
    deleteHPA(
      { namespace: hpaNamespace, name: hpaName },
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
            ariaLabel="Edit HPA"
            onClick={() =>
              openTab("modification", { kind: "HPA", name: hpaName, namespace: hpaNamespace })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete HPA"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <HPADeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={hpaName}
        namespace={hpaNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

const HPAOverviewTab: FC<{ hpa: HPADetail }> = ({ hpa }) => {
  const {
    onToggleNamespaceDetail,
    onToggleDeploymentDetail,
    onToggleStatefulSetDetail,
    onToggleDaemonSetDetail,
  } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleDeploymentDetail: v.onToggleDeploymentDetail,
    onToggleStatefulSetDetail: v.onToggleStatefulSetDetail,
    onToggleDaemonSetDetail: v.onToggleDaemonSetDetail,
  }));

  const SCALE_TARGET_LINKS: Record<string, (namespace: string, name: string) => void> = {
    deployment: onToggleDeploymentDetail,
    statefulset: onToggleStatefulSetDetail,
    daemonset: onToggleDaemonSetDetail,
  };

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {hpa.Age} ago ({hpa.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{hpa.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(hpa.Namespace)}>
          {hpa.Namespace}
        </ResourceLink>

        <span className="text-h3 text-muted-foreground">Labels</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(hpa.Labels ?? {}).length > 0 ? (
            Object.entries(hpa.Labels).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <span className="text-h3 text-muted-foreground">Annotations</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(hpa.Annotations ?? {}).length > 0 ? (
            Object.entries(hpa.Annotations).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <span className="text-h3 text-muted-foreground">Reference</span>
        <span className="text-body font-mono">
          {hpa.ScaleTargetRef.Kind}:{" "}
          {SCALE_TARGET_LINKS[hpa.ScaleTargetRef.Kind.toLowerCase()] ? (
            <ResourceLink
              onClick={() =>
                SCALE_TARGET_LINKS[hpa.ScaleTargetRef.Kind.toLowerCase()](
                  hpa.Namespace,
                  hpa.ScaleTargetRef.Name
                )
              }
            >
              {hpa.ScaleTargetRef.Name}
            </ResourceLink>
          ) : (
            hpa.ScaleTargetRef.Name
          )}
        </span>

        <span className="text-h3 text-muted-foreground">Min Pods</span>
        <span className="text-body font-mono">{hpa.MinPods}</span>

        <span className="text-h3 text-muted-foreground">Max Pods</span>
        <span className="text-body font-mono">{hpa.MaxPods}</span>

        <span className="text-h3 text-muted-foreground">Replicas</span>
        <span className="text-body font-mono">{hpa.Replicas}</span>

        <span className="text-h3 text-muted-foreground">Status</span>
        <HPAStatusBadge status={hpa.Status} />
      </div>

      <SectionDivider
        label="Metrics"
        className="border-y-0 border-t bg-muted/50 tracking-wide uppercase"
      />

      {(hpa.Metrics ?? []).length === 0 ? (
        <span className="px-4 py-2 text-xs text-muted-foreground">—</span>
      ) : (
        <div className="flex flex-col px-4 py-2">
          <div className="grid grid-cols-[1fr_120px] gap-x-4 border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-muted-foreground">Name</span>
            <span className="text-right text-xs font-semibold text-muted-foreground">
              Current / Target
            </span>
          </div>
          {hpa.Metrics.map((m) => (
            <div key={m.Name} className="grid grid-cols-[1fr_120px] gap-x-4 py-2 text-xs">
              <span className="font-mono">{m.Name}</span>
              <span className="text-right font-mono">
                {m.Current} / {m.Target}
              </span>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
};

const HPAEventsTab: FC<{ hpa: HPADetail }> = ({ hpa }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [hpa.Namespace],
  });
  const hpaEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "horizontalpodautoscaler" &&
      e.InvolvedObjectName === hpa.Name &&
      e.Namespace === hpa.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={hpaEvents} />
    </ScrollArea>
  );
};

interface HPADetailDrawerProps {
  hpaName: string | null;
  hpaNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const HPADrawerBody: FC<
  HPADetailDrawerProps & {
    hpaName: string;
    hpaNamespace: string;
    onDataChange: (hpa: HPADetail | undefined) => void;
  }
> = ({ hpaName, hpaNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: hpa, isLoading } = useGetHPADetail(activeContext, hpaNamespace, hpaName);
  useCatchForbiddenResource("hpa", {
    open,
    resourceName: hpaName,
    resourceLabel: "HPA",
    namespace: hpaNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(hpa);
  }, [hpa, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!hpa) {
    return <ResourceDetailEmptyBody resourceKind="HorizontalPodAutoscaler" />;
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
        <HPAOverviewTab hpa={hpa} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <HPAEventsTab hpa={hpa} />}
      </TabsContent>
    </Tabs>
  );
};

export const HPADetailDrawer: FC<HPADetailDrawerProps> = ({
  hpaName,
  hpaNamespace,
  open,
  onClose,
}) => {
  const [hpa, setHpa] = useState<HPADetail | undefined>(undefined);

  const hasData = !!hpaName && !!hpaNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">HPA: {hpa?.Name ?? hpaName}</SheetTitle>
        {hpa && (
          <HPADrawerCtaButtons hpaName={hpa.Name} hpaNamespace={hpa.Namespace} onClose={onClose} />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <HPADrawerBody
          key={hpaName}
          hpaName={hpaName}
          hpaNamespace={hpaNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setHpa}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Horizontal Pod Autoscaler" />
      )}
    </ResourceDetailDrawer>
  );
};
