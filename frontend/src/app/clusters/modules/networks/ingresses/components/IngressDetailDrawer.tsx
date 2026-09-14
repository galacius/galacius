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
} from "@galacius/design-system";
import { FC, useEffect, useState } from "react";
import { useCatchForbiddenResource } from "../../../../../shared/hooks/async-events/useCatchForbiddenResource";
import { useMainLayoutContext } from "../../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { IngressDetail, IngressRule } from "../api/resources";
import { useGetIngressDetail } from "../hooks/data-access/useGetIngressDetail";
import { useDeleteIngress } from "../hooks/data-mutation/useDeleteIngress";
import { IngressDeleteConfirmationModal } from "./IngressDeleteConfirmationModal";

const IngressRulesSection: FC<{ rules: IngressRule[] }> = ({ rules }) => (
  <div className="flex flex-col">
    {rules.map((rule) => (
      <div
        key={`${rule.Host || "*"}::${(rule.Paths ?? []).map((p) => p.Path).join(",")}`}
        className="border-t border-muted/40 first:border-t-0"
      >
        <div className="px-4 py-2">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Host: {rule.Host || "*"}
          </p>
          {rule.Paths && rule.Paths.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-muted/40">
                  <th className="py-1 pr-4 text-left font-semibold text-muted-foreground">Path</th>
                  <th className="py-1 pr-4 text-left font-semibold text-muted-foreground">Link</th>
                  <th className="py-1 text-left font-semibold text-muted-foreground">Backends</th>
                </tr>
              </thead>
              <tbody>
                {rule.Paths.map((path) => (
                  <tr key={path.Path} className="border-b border-muted/40 last:border-b-0">
                    <td className="py-1 pr-4 font-mono">{path.Path}</td>
                    <td className="py-1 pr-4">
                      <a
                        href={`http://${rule.Host}${path.Path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-info hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        http://{rule.Host}
                        {path.Path}
                      </a>
                    </td>
                    <td className="truncate py-1 font-mono">{path.Backend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <span className="text-xs text-muted-foreground">No paths configured</span>
          )}
        </div>
      </div>
    ))}
  </div>
);

const IngressOverviewTab: FC<{ ingress: IngressDetail }> = ({ ingress }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
          <span className="text-h3 text-muted-foreground">Created</span>
          <span className="text-body font-mono">
            {ingress.Age} ago ({ingress.CreatedAt})
          </span>

          <span className="text-h3 text-muted-foreground">Name</span>
          <span className="text-body font-mono">{ingress.Name}</span>

          <span className="text-h3 text-muted-foreground">Namespace</span>
          <ResourceLink onClick={() => onToggleNamespaceDetail(ingress.Namespace)}>
            {ingress.Namespace}
          </ResourceLink>

          <span className="text-h3 text-muted-foreground">Labels</span>
          <div className="flex flex-wrap gap-1">
            {Object.keys(ingress.Labels ?? {}).length > 0 ? (
              Object.entries(ingress.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={`${k}=${v}`} />
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>

          <span className="text-h3 text-muted-foreground">Annotations</span>
          <div className="flex flex-wrap gap-1">
            {Object.keys(ingress.Annotations ?? {}).length > 0 ? (
              Object.entries(ingress.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={`${k}=${v}`} />
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>

          {ingress.Ports && (
            <>
              <span className="text-h3 text-muted-foreground">Ports</span>
              <span className="text-body font-mono">{ingress.Ports}</span>
            </>
          )}
        </div>

        {ingress.Rules && ingress.Rules.length > 0 && (
          <>
            <SectionDivider label="Rules" />
            <IngressRulesSection rules={ingress.Rules} />
          </>
        )}

        {ingress.LoadBalancers && ingress.LoadBalancers.length > 0 && (
          <>
            <SectionDivider label="Load-Balancer Ingress Points" />
            <div className="px-4 py-2">
              <span className="font-mono text-xs">{ingress.LoadBalancers}</span>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

const IngressEventsTab: FC<{ ingress: IngressDetail }> = ({ ingress }) => {
  const { activeContext } = useMainLayoutContext();
  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [ingress.Namespace],
  });
  const ingressEvents = events.filter(
    (e) => e.InvolvedObjectKind.toLowerCase() === "ingress" && e.InvolvedObjectName === ingress.Name
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={ingressEvents} />
    </ScrollArea>
  );
};

interface IngressDrawerCtaButtonsProps {
  ingressName: string;
  ingressNamespace: string;
  onClose: () => void;
}

const IngressDrawerCtaButtons: FC<IngressDrawerCtaButtonsProps> = ({
  ingressName,
  ingressNamespace,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteIngress, isPending: isDeletePending } = useDeleteIngress();

  const handleDeleteConfirm = () => {
    deleteIngress(
      { namespace: ingressNamespace, name: ingressName },
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
        <ResourceModificationButton
          mode="icon-button"
          ariaLabel="Edit Ingress"
          onClick={() =>
            openTab("modification", {
              kind: "Ingress",
              name: ingressName,
              namespace: ingressNamespace,
            })
          }
        />
        <ResourceDeletionButton
          mode="icon-button"
          ariaLabel="Delete Ingress"
          disabled={isDeletePending}
          onClick={() => setShowDeleteModal(true)}
        />
      </ButtonGroup>

      <IngressDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={ingressName}
        namespace={ingressNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface IngressDetailDrawerProps {
  ingressName: string | null;
  ingressNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const IngressDrawerBody: FC<
  IngressDetailDrawerProps & {
    ingressName: string;
    ingressNamespace: string;
    onDataChange: (ingress: IngressDetail | undefined) => void;
  }
> = ({ ingressName, ingressNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();
  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: ingress, isLoading } = useGetIngressDetail(
    activeContext,
    ingressNamespace,
    ingressName
  );
  useCatchForbiddenResource("ingresses", {
    open,
    resourceName: ingressName,
    resourceLabel: "Ingress",
    namespace: ingressNamespace,
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(ingress?.Name ? ingress : undefined);
  }, [ingress, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!ingress?.Name) {
    return <ResourceDetailEmptyBody resourceKind="Ingress" />;
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
        <IngressOverviewTab ingress={ingress} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <IngressEventsTab ingress={ingress} />}
      </TabsContent>
    </Tabs>
  );
};

export const IngressDetailDrawer: FC<IngressDetailDrawerProps> = ({
  ingressName,
  ingressNamespace,
  open,
  onClose,
}) => {
  const [ingress, setIngress] = useState<IngressDetail | undefined>(undefined);

  const hasData = !!ingressName && !!ingressNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Ingress: {ingress?.Name ?? ingressName}</SheetTitle>
        {ingress && (
          <IngressDrawerCtaButtons
            ingressName={ingress.Name}
            ingressNamespace={ingress.Namespace}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <IngressDrawerBody
          key={`${ingressNamespace}/${ingressName}`}
          ingressName={ingressName}
          ingressNamespace={ingressNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setIngress}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Ingress" />
      )}
    </ResourceDetailDrawer>
  );
};
