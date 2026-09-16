import {
  AnnotationBadge,
  ButtonGroup,
  LoadingSpinner,
  ResourceDeletionButton,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceDetailEmptyBody,
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
import { FC, Fragment, useEffect, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { PodSimpleTable } from "../../../workloads/pods/components/PodSimpleTable";
import { useGetPods } from "../../../workloads/pods/hooks/data-access/useGetPods";
import { EventsTable } from "../../events/components/EventsTable";
import { useGetEvents } from "../../events/hooks/data-access/useGetEvents";
import type { Node } from "../api/resources";
import { useGetNodeDetail } from "../hooks/data-access/useGetNodeDetail";
import { useCordonNode } from "../hooks/data-mutation/useCordonNode";
import { useDeleteNode } from "../hooks/data-mutation/useDeleteNode";
import { useDrainNode } from "../hooks/data-mutation/useDrainNode";
import { useUncordonNode } from "../hooks/data-mutation/useUncordonNode";
import { NodeConditionBadge } from "./NodeConditionBadge";
import { NodeCordonButton } from "./NodeCordonButton";
import { NodeCordonConfirmationModal } from "./NodeCordonConfirmationModal";
import { NodeDeleteConfirmationModal } from "./NodeDeleteConfirmationModal";
import { NodeDrainButton } from "./NodeDrainButton";
import { NodeDrainConfirmationModal } from "./NodeDrainConfirmationModal";
import { NodeSchedulableBadge } from "./NodeSchedulableBadge";
import { NodeUncordonButton } from "./NodeUncordonButton";
import { NodeUncordonConfirmationModal } from "./NodeUncordonConfirmationModal";

const KVSection: FC<{ title: string; data: Record<string, string> }> = ({ title, data }) => {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return null;
  return (
    <div>
      <SectionDivider label={title} className="border-y-0 bg-muted/50 tracking-wide uppercase" />
      <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-y-2 px-4 py-3">
        {entries.map(([k, v]) => (
          <Fragment key={k}>
            <span className="text-h3 font-mono text-muted-foreground">{k}</span>
            <span className="text-body font-mono">{v}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
};

const NodeInfoTab: FC<{ node: Node }> = ({ node }) => {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-0">
        {/* Metadata — single grid so all labels align */}
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
          <span className="text-h3 text-muted-foreground">Created</span>
          <span className="text-body font-mono">
            {node.Age} ago ({node.CreatedAt})
          </span>

          <span className="text-h3 text-muted-foreground">Name</span>
          <span className="text-body font-mono">{node.Name}</span>

          {Object.keys(node.Labels).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Labels</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(node.Labels).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {Object.keys(node.Annotations).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Annotations</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(node.Annotations).map(([k, v]) => (
                  <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                ))}
              </div>
            </>
          )}

          {(node.ManagedFields ?? []).length > 0 && (
            <>
              <span className="text-h3 self-start pt-0.5 text-muted-foreground">
                Managed Fields
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                {node.ManagedFields.map((mf) => (
                  <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
                ))}
              </div>
            </>
          )}

          {(node.Addresses ?? []).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Addresses</span>
              <div className="flex flex-col gap-0.5">
                {node.Addresses.map((a) => (
                  <span key={`${a.Type}-${a.Address}`} className="text-body font-mono">
                    {a.Type}: {a.Address}
                  </span>
                ))}
              </div>
            </>
          )}

          <span className="text-h3 text-muted-foreground">OS</span>
          <span className="text-body font-mono">
            {node.OS} ({node.OSImage})
          </span>

          <span className="text-h3 text-muted-foreground">Kernel version</span>
          <span className="text-body font-mono">{node.KernelVersion}</span>

          <span className="text-h3 text-muted-foreground">Container runtime</span>
          <span className="text-body font-mono">{node.ContainerRuntime}</span>

          <span className="text-h3 text-muted-foreground">Kubelet version</span>
          <span className="text-body font-mono">{node.Version}</span>

          <span className="text-h3 text-muted-foreground">Schedulable</span>
          <div>
            <NodeSchedulableBadge schedulable={!node.Unschedulable} />
          </div>

          {(node.Conditions ?? []).length > 0 && (
            <>
              <span className="text-h3 text-muted-foreground">Conditions</span>
              <div className="flex flex-wrap gap-1">
                {node.Conditions.map((c) => (
                  <NodeConditionBadge key={c.Type} condition={c} />
                ))}
              </div>
            </>
          )}
        </div>

        <Separator />
        <KVSection title="Capacity" data={node.Capacity ?? {}} />
        <Separator />
        <KVSection title="Allocatable" data={node.Allocatable ?? {}} />
      </div>
    </ScrollArea>
  );
};

const NodeEventsTab: FC<{ node: Node }> = ({ node }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({ context: activeContext, namespaces: [] });
  const nodeEvents = events.filter(
    (e) => e.InvolvedObjectKind.toLowerCase() === "node" && e.InvolvedObjectName === node.Name
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={nodeEvents} />
    </ScrollArea>
  );
};

const NodePodsTab: FC<{ node: Node }> = ({ node }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: pods = [] } = useGetPods({ context: activeContext, namespaces: [] });
  const nodePods = pods
    .filter((p) => p.NodeName === node.Name)
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  return <PodSimpleTable pods={nodePods} />;
};

const NodeDrawerCtaButtons: FC<{ name: string; unschedulable: boolean; onDeleted: () => void }> = ({
  name,
  unschedulable,
  onDeleted,
}) => {
  const { openTab } = useUnifiedTray();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCordonModal, setShowCordonModal] = useState(false);
  const [showUncordonModal, setShowUncordonModal] = useState(false);
  const [showDrainModal, setShowDrainModal] = useState(false);

  const { mutate: deleteNode, isPending: isDeletePending } = useDeleteNode();
  const { mutate: cordonNode, isPending: isCordonPending } = useCordonNode();
  const { mutate: drainNode, isPending: isDrainPending } = useDrainNode();
  const { mutate: uncordonNode, isPending: isUncordonPending } = useUncordonNode();

  const handleDeleteConfirm = () => {
    deleteNode(
      { name },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onDeleted();
        },
      }
    );
  };

  const handleCordonConfirm = () => {
    cordonNode({ name }, { onSuccess: () => setShowCordonModal(false) });
  };

  const handleDrainConfirm = () => {
    drainNode({ name }, { onSuccess: () => setShowDrainModal(false) });
  };

  const handleUncordonConfirm = () => {
    uncordonNode({ name }, { onSuccess: () => setShowUncordonModal(false) });
  };

  return (
    <>
      <TooltipProvider>
        <ButtonGroup>
          {!unschedulable ? (
            <NodeCordonButton
              mode="icon-button"
              ariaLabel="Cordon Node"
              disabled={isCordonPending}
              onClick={() => setShowCordonModal(true)}
            />
          ) : (
            <NodeUncordonButton
              mode="icon-button"
              ariaLabel="Uncordon Node"
              disabled={isUncordonPending}
              onClick={() => setShowUncordonModal(true)}
            />
          )}
          <NodeDrainButton
            mode="icon-button"
            ariaLabel="Drain Node"
            disabled={isDrainPending}
            onClick={() => setShowDrainModal(true)}
          />
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit Node"
            onClick={() => openTab("modification", { kind: "Node", name })}
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete Node"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </ButtonGroup>
      </TooltipProvider>

      <NodeDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      <NodeCordonConfirmationModal
        open={showCordonModal}
        name={name}
        isPending={isCordonPending}
        onClose={() => setShowCordonModal(false)}
        onConfirm={handleCordonConfirm}
      />

      <NodeUncordonConfirmationModal
        open={showUncordonModal}
        name={name}
        isPending={isUncordonPending}
        onClose={() => setShowUncordonModal(false)}
        onConfirm={handleUncordonConfirm}
      />

      <NodeDrainConfirmationModal
        open={showDrainModal}
        name={name}
        isPending={isDrainPending}
        onClose={() => setShowDrainModal(false)}
        onConfirm={handleDrainConfirm}
      />
    </>
  );
};

interface NodeDetailDrawerProps {
  nodeName: string | null;
  open: boolean;
  onClose: () => void;
}

const NodeDrawerBody: FC<
  NodeDetailDrawerProps & {
    nodeName: string;
    onDataChange: (node: Node | undefined) => void;
  }
> = ({ nodeName, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: node, isLoading } = useGetNodeDetail(activeContext, nodeName);
  useCatchForbiddenResource("nodes", {
    open,
    resourceName: nodeName,
    resourceLabel: "Node",
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(node);
  }, [node, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!node) {
    return <ResourceDetailEmptyBody resourceKind="Node" />;
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
        <NodeInfoTab node={node} />
      </TabsContent>
      <TabsContent value="pods" className="mt-0 min-h-0 flex-1">
        <NodePodsTab node={node} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <NodeEventsTab node={node} />}
      </TabsContent>
    </Tabs>
  );
};

export const NodeDetailDrawer: FC<NodeDetailDrawerProps> = ({ nodeName, open, onClose }) => {
  const [node, setNode] = useState<Node | undefined>(undefined);

  const hasData = !!nodeName;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Node: {node?.Name ?? nodeName}</SheetTitle>
        {node && (
          <NodeDrawerCtaButtons
            name={node.Name}
            unschedulable={node.Unschedulable}
            onDeleted={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <NodeDrawerBody
          key={nodeName}
          nodeName={nodeName}
          open={open}
          onClose={onClose}
          onDataChange={setNode}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Node" />
      )}
    </ResourceDetailDrawer>
  );
};
