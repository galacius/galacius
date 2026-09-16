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
import { ManagedFieldBlock } from "../../../../shared/components/ManagedFieldBlock";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { NetworkPolicyDetail, NetworkPolicyPeer } from "../api/resources";
import { useGetNetworkPolicyDetail } from "../hooks/data-access/useGetNetworkPolicyDetail";
import { useDeleteNetworkPolicy } from "../hooks/data-mutation/useDeleteNetworkPolicy";
import { NetworkPolicyDeleteConfirmationModal } from "./NetworkPolicyDeleteConfirmationModal";

function peerKey(peer: NetworkPolicyPeer): string {
  return [
    peer.IPBlock ?? "",
    JSON.stringify(peer.PodSelector ?? {}),
    JSON.stringify(peer.NamespaceSelector ?? {}),
  ].join("|");
}

const PeerBlock: FC<{ peer: NetworkPolicyPeer }> = ({ peer }) => (
  <div className="text-xs">
    {Object.keys(peer.PodSelector ?? {}).length > 0 && (
      <div className="mb-1">
        <span className="text-muted-foreground">Pod: </span>
        <div className="mt-1 flex flex-wrap gap-1">
          {Object.entries(peer.PodSelector).map(([k, v]) => (
            <AnnotationBadge key={k} label={`${k}=${v}`} />
          ))}
        </div>
      </div>
    )}
    {Object.keys(peer.NamespaceSelector ?? {}).length > 0 && (
      <div className="mb-1">
        <span className="text-muted-foreground">Namespace: </span>
        <div className="mt-1 flex flex-wrap gap-1">
          {Object.entries(peer.NamespaceSelector).map(([k, v]) => (
            <AnnotationBadge key={k} label={`${k}=${v}`} />
          ))}
        </div>
      </div>
    )}
    {peer.IPBlock && (
      <div>
        <span className="text-muted-foreground">CIDR: </span>
        <span className="font-mono">{peer.IPBlock}</span>
      </div>
    )}
  </div>
);

const NetworkPolicyOverviewTab: FC<{ np: NetworkPolicyDetail }> = ({ np }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  return (
    <ScrollArea className="h-full">
      {/* Metadata */}
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {new Date(np.CreatedAt).toLocaleString()} ({np.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{np.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(np.Namespace)}>
          {np.Namespace}
        </ResourceLink>

        <span className="text-h3 text-muted-foreground">Labels</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(np.Labels ?? {}).length > 0 ? (
            Object.entries(np.Labels).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <span className="text-h3 text-muted-foreground">Annotations</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(np.Annotations ?? {}).length > 0 ? (
            Object.entries(np.Annotations).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        {(np.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {np.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Pod Selector</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(np.PodSelector ?? {}).length > 0 ? (
            Object.entries(np.PodSelector).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {/* Ingress */}
      <SectionDivider label="Ingress" className="tracking-wide uppercase" />
      {(() => {
        const rules = (np.IngressRules ?? []).filter(
          (r) => (r.Ports?.length ?? 0) > 0 || (r.From?.length ?? 0) > 0
        );
        return rules.length === 0 ? (
          <p className="px-4 py-2 text-xs text-muted-foreground">No ingress rules</p>
        ) : (
          rules.map((rule) => {
            const ruleKey = `${(rule.Ports ?? []).join(",")}::${(rule.From ?? []).map(peerKey).join(",")}`;
            return (
              <div key={ruleKey} className="border-t border-muted/40 first:border-0">
                <div className="p-4">
                  {rule.Ports && rule.Ports.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Ports</p>
                      <div className="flex flex-wrap gap-1">
                        {rule.Ports.map((port) => (
                          <span
                            key={port}
                            className="rounded bg-muted/40 px-2 py-1 font-mono text-xs"
                          >
                            {port}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {rule.From && rule.From.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">From</p>
                      <div className="flex flex-col gap-2">
                        {rule.From.map((peer) => (
                          <PeerBlock key={peerKey(peer)} peer={peer} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        );
      })()}

      {/* Egress */}
      <SectionDivider label="Egress" className="tracking-wide uppercase" />
      {(() => {
        const rules = (np.EgressRules ?? []).filter(
          (r) => (r.Ports?.length ?? 0) > 0 || (r.To?.length ?? 0) > 0
        );
        return rules.length === 0 ? (
          <p className="px-4 py-2 text-xs text-muted-foreground">No egress rules</p>
        ) : (
          rules.map((rule) => {
            const ruleKey = `${(rule.Ports ?? []).join(",")}::${(rule.To ?? []).map(peerKey).join(",")}`;
            return (
              <div key={ruleKey} className="border-t border-muted/40 first:border-0">
                <div className="p-4">
                  {rule.Ports && rule.Ports.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Ports</p>
                      <div className="flex flex-wrap gap-1">
                        {rule.Ports.map((port) => (
                          <span
                            key={port}
                            className="rounded bg-muted/40 px-2 py-1 font-mono text-xs"
                          >
                            {port}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {rule.To && rule.To.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">To</p>
                      <div className="flex flex-col gap-2">
                        {rule.To.map((peer) => (
                          <PeerBlock key={peerKey(peer)} peer={peer} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        );
      })()}
    </ScrollArea>
  );
};

const NetworkPolicyEventsTab: FC<{ np: NetworkPolicyDetail }> = ({ np }) => {
  const { activeContext } = useMainLayoutContext();
  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [np.Namespace],
  });
  const npEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "networkpolicy" && e.InvolvedObjectName === np.Name
  );
  return (
    <ScrollArea className="h-full">
      <EventsTable events={npEvents} />
    </ScrollArea>
  );
};

interface NetworkPolicyDrawerCtaButtonsProps {
  npName: string;
  npNamespace: string;
  onClose: () => void;
}

const NetworkPolicyDrawerCtaButtons: FC<NetworkPolicyDrawerCtaButtonsProps> = ({
  npName,
  npNamespace,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteNetworkPolicy, isPending: isDeletePending } = useDeleteNetworkPolicy();

  const handleDeleteConfirm = () => {
    deleteNetworkPolicy(
      { namespace: npNamespace, name: npName },
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
      <TooltipProvider>
        <ButtonGroup>
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit Network Policy"
            onClick={() =>
              openTab("modification", {
                kind: "NetworkPolicy",
                name: npName,
                namespace: npNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete Network Policy"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </ButtonGroup>
      </TooltipProvider>

      <NetworkPolicyDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={npName}
        namespace={npNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface NetworkPolicyDetailDrawerProps {
  npName: string | null;
  npNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const NetworkPolicyDrawerBody: FC<
  NetworkPolicyDetailDrawerProps & {
    npName: string;
    npNamespace: string;
    onDataChange: (np: NetworkPolicyDetail | undefined) => void;
  }
> = ({ npName, npNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();
  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: np, isLoading } = useGetNetworkPolicyDetail(activeContext, npNamespace, npName);
  useCatchForbiddenResource("networkpolicies", {
    open,
    resourceName: npName,
    resourceLabel: "Network Policy",
    namespace: npNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(np);
  }, [np, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!np) {
    return <ResourceDetailEmptyBody resourceKind="Network Policy" />;
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
        <NetworkPolicyOverviewTab np={np} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <NetworkPolicyEventsTab np={np} />}
      </TabsContent>
    </Tabs>
  );
};

export const NetworkPolicyDetailDrawer: FC<NetworkPolicyDetailDrawerProps> = ({
  npName,
  npNamespace,
  open,
  onClose,
}) => {
  const [np, setNp] = useState<NetworkPolicyDetail | undefined>(undefined);

  const hasData = !!npName && !!npNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Network Policy: {np?.Name ?? npName}</SheetTitle>
        {np && (
          <NetworkPolicyDrawerCtaButtons
            npName={np.Name}
            npNamespace={np.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <NetworkPolicyDrawerBody
          key={`${npNamespace}/${npName}`}
          npName={npName}
          npNamespace={npNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setNp}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Network Policy" />
      )}
    </ResourceDetailDrawer>
  );
};
