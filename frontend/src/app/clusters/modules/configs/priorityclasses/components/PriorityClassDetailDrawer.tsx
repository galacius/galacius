import {
  Badge,
  ButtonGroup,
  LoadingSpinner,
  ResourceDeletionButton,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceDetailEmptyBody,
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
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { PriorityClass } from "../api/resources";
import { useGetPriorityClassByName } from "../hooks/data-access/useGetPriorityClassByName";
import { useDeletePriorityClass } from "../hooks/data-mutation/useDeletePriorityClass";
import { PriorityClassDeleteConfirmationModal } from "./PriorityClassDeleteConfirmationModal";

const PriorityClassOverviewTab: FC<{ pc: PriorityClass }> = ({ pc }) => {
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {pc.Age} ago ({pc.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{pc.Name}</span>

        {(pc.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {pc.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        {pc.Description && (
          <>
            <span className="text-h3 text-muted-foreground">Description</span>
            <span className="text-body">{pc.Description}</span>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Value</span>
        <span className="text-body font-mono">{pc.Value}</span>

        <span className="text-h3 text-muted-foreground">Global Default</span>
        <span>
          {pc.GlobalDefault ? (
            <Badge className="bg-success text-white hover:bg-success">true</Badge>
          ) : (
            <Badge className="bg-zinc-700 text-white hover:bg-zinc-700">false</Badge>
          )}
        </span>

        {pc.PreemptionPolicy && (
          <>
            <span className="text-h3 text-muted-foreground">Preemption Policy</span>
            <span className="text-body font-mono">{pc.PreemptionPolicy}</span>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

const PriorityClassEventsTab: FC<{ pc: PriorityClass }> = ({ pc }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({ context: activeContext, namespaces: [] });
  const pcEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "priorityclass" && e.InvolvedObjectName === pc.Name
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={pcEvents} />
    </ScrollArea>
  );
};

interface PriorityClassDrawerCtaButtonsProps {
  name: string;
  onClose: () => void;
}

const PriorityClassDrawerCtaButtons: FC<PriorityClassDrawerCtaButtonsProps> = ({
  name,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteSingle, isPending: isDeletePending } = useDeletePriorityClass();

  const handleConfirmDelete = () => {
    deleteSingle(
      { name },
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
            ariaLabel="Edit PriorityClass"
            onClick={() => openTab("modification", { kind: "PriorityClass", name })}
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete PriorityClass"
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <PriorityClassDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

interface PriorityClassDetailDrawerProps {
  priorityClassName: string | null;
  open: boolean;
  onClose: () => void;
}

const PriorityClassDrawerBody: FC<
  PriorityClassDetailDrawerProps & {
    priorityClassName: string;
    onDataChange: (pc: PriorityClass | undefined) => void;
  }
> = ({ priorityClassName, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: pc, isLoading } = useGetPriorityClassByName(activeContext, priorityClassName);
  useCatchForbiddenResource("priorityclasses", {
    open,
    resourceName: priorityClassName,
    resourceLabel: "PriorityClass",
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(pc?.Name ? pc : undefined);
  }, [pc, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!pc?.Name) {
    return <ResourceDetailEmptyBody resourceKind="PriorityClass" />;
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
        <PriorityClassOverviewTab pc={pc} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <PriorityClassEventsTab pc={pc} />}
      </TabsContent>
    </Tabs>
  );
};

export const PriorityClassDetailDrawer: FC<PriorityClassDetailDrawerProps> = ({
  priorityClassName,
  open,
  onClose,
}) => {
  const [pc, setPc] = useState<PriorityClass | undefined>(undefined);

  const hasData = !!priorityClassName;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Priority Class: {pc?.Name ?? priorityClassName}</SheetTitle>
        {pc && <PriorityClassDrawerCtaButtons name={pc.Name} onClose={onClose} />}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <PriorityClassDrawerBody
          key={priorityClassName}
          priorityClassName={priorityClassName}
          open={open}
          onClose={onClose}
          onDataChange={setPc}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Priority Class" />
      )}
    </ResourceDetailDrawer>
  );
};
