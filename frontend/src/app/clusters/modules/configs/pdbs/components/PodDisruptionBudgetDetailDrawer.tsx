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
import type { PodDisruptionBudgetDetail } from "../api/resources";
import { useGetPodDisruptionBudgetDetail } from "../hooks/data-access/useGetPodDisruptionBudgetDetail";
import { useDeletePodDisruptionBudget } from "../hooks/data-mutation/useDeletePodDisruptionBudget";
import { PodDisruptionBudgetDeleteConfirmationModal } from "./PodDisruptionBudgetDeleteConfirmationModal";

interface PDBDrawerCtaButtonsProps {
  pdbName: string;
  pdbNamespace: string;
  onClose: () => void;
}

const PDBDrawerCtaButtons: FC<PDBDrawerCtaButtonsProps> = ({ pdbName, pdbNamespace, onClose }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deletePodDisruptionBudget, isPending: isDeletePending } =
    useDeletePodDisruptionBudget();

  const handleDeleteConfirm = () => {
    deletePodDisruptionBudget(
      { namespace: pdbNamespace, name: pdbName },
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
            ariaLabel="Edit PodDisruptionBudget"
            onClick={() =>
              openTab("modification", {
                kind: "PodDisruptionBudget",
                name: pdbName,
                namespace: pdbNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete PodDisruptionBudget"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <PodDisruptionBudgetDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={pdbName}
        namespace={pdbNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

const PDBOverviewTab: FC<{ pdb: PodDisruptionBudgetDetail }> = ({ pdb }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  const hasLabels = Object.keys(pdb.Labels ?? {}).length > 0;
  const hasAnnotations = Object.keys(pdb.Annotations ?? {}).length > 0;
  const hasSelector = Object.keys(pdb.Selector ?? {}).length > 0;

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {pdb.Age} ago ({pdb.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{pdb.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(pdb.Namespace)}>
          {pdb.Namespace}
        </ResourceLink>

        {hasLabels && (
          <>
            <span className="text-h3 text-muted-foreground">Labels</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(pdb.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {hasAnnotations && (
          <>
            <span className="text-h3 text-muted-foreground">Annotations</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(pdb.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {hasSelector && (
          <>
            <span className="text-h3 text-muted-foreground">Selector</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(pdb.Selector).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Min Available</span>
        <span className="text-body font-mono">{pdb.MinAvailable || "—"}</span>

        <span className="text-h3 text-muted-foreground">Max Unavailable</span>
        <span className="text-body font-mono">{pdb.MaxUnavailable || "—"}</span>

        <span className="text-h3 text-muted-foreground">Current Healthy</span>
        <span className="text-body font-mono">{pdb.CurrentHealthy}</span>

        <span className="text-h3 text-muted-foreground">Desired Healthy</span>
        <span className="text-body font-mono">{pdb.DesiredHealthy}</span>
      </div>
    </ScrollArea>
  );
};

const PDBEventsTab: FC<{ pdb: PodDisruptionBudgetDetail }> = ({ pdb }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [pdb.Namespace],
  });
  const pdbEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "poddisruptionbudget" &&
      e.InvolvedObjectName === pdb.Name &&
      e.Namespace === pdb.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={pdbEvents} />
    </ScrollArea>
  );
};

interface PDBDetailDrawerProps {
  pdbName: string | null;
  pdbNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const PDBDrawerBody: FC<
  PDBDetailDrawerProps & {
    pdbName: string;
    pdbNamespace: string;
    onDataChange: (pdb: PodDisruptionBudgetDetail | undefined) => void;
  }
> = ({ pdbName, pdbNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: pdb, isLoading } = useGetPodDisruptionBudgetDetail(
    activeContext,
    pdbNamespace,
    pdbName
  );
  useCatchForbiddenResource("pdbs", {
    open,
    resourceName: pdbName,
    resourceLabel: "Pod Disruption Budget",
    namespace: pdbNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(pdb);
  }, [pdb, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!pdb) {
    return <ResourceDetailEmptyBody resourceKind="Pod Disruption Budget" />;
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
        <PDBOverviewTab pdb={pdb} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <PDBEventsTab pdb={pdb} />}
      </TabsContent>
    </Tabs>
  );
};

export const PodDisruptionBudgetDetailDrawer: FC<PDBDetailDrawerProps> = ({
  pdbName,
  pdbNamespace,
  open,
  onClose,
}) => {
  const [pdb, setPdb] = useState<PodDisruptionBudgetDetail | undefined>(undefined);

  const hasData = !!pdbName && !!pdbNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Pod Disruption Budget: {pdb?.Name ?? pdbName}</SheetTitle>
        {pdb && (
          <PDBDrawerCtaButtons pdbName={pdb.Name} pdbNamespace={pdb.Namespace} onClose={onClose} />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <PDBDrawerBody
          key={`${pdbNamespace}/${pdbName}`}
          pdbName={pdbName}
          pdbNamespace={pdbNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setPdb}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Pod Disruption Budget" />
      )}
    </ResourceDetailDrawer>
  );
};
