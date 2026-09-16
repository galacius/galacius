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
import { SectionDivider } from "../../../../shared/components/details/SectionDivider";
import { useUnifiedTray } from "../../../../shared/components/trays/unified/UnifiedTrayContext";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import type { ValidatingWebhookConfigDetail, WebhookDetail } from "../api/resources";
import { useGetValidatingWebhookConfigDetail } from "../hooks/data-access/useGetValidatingWebhookConfigDetail";
import { useDeleteValidatingWebhookConfig } from "../hooks/data-mutation/useDeleteValidatingWebhookConfig";
import { ValidatingWebhookConfigDeleteConfirmationModal } from "./ValidatingWebhookConfigDeleteConfirmationModal";

const WebhookBlock: FC<{ webhook: WebhookDetail }> = ({ webhook }) => (
  <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3">
    {webhook.Name && (
      <>
        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{webhook.Name}</span>
      </>
    )}
    {(webhook.ClientConfigServiceName || webhook.ClientConfigServiceNamespace) && (
      <>
        <span className="text-h3 text-muted-foreground">Client Config</span>
        <div className="text-body font-mono whitespace-pre-wrap">
          {webhook.ClientConfigServiceName && `Name: ${webhook.ClientConfigServiceName}\n`}
          {webhook.ClientConfigServiceNamespace &&
            `Namespace: ${webhook.ClientConfigServiceNamespace}`}
        </div>
      </>
    )}
    {webhook.MatchPolicy && (
      <>
        <span className="text-h3 text-muted-foreground">Match Policy</span>
        <span className="text-body">{webhook.MatchPolicy}</span>
      </>
    )}
    {webhook.FailurePolicy && (
      <>
        <span className="text-h3 text-muted-foreground">Failure Policy</span>
        <span className="text-body">{webhook.FailurePolicy}</span>
      </>
    )}
    {webhook.AdmissionReviewVersions && webhook.AdmissionReviewVersions.length > 0 && (
      <>
        <span className="text-h3 text-muted-foreground">Admission Review Versions</span>
        <span className="text-body">{webhook.AdmissionReviewVersions.join(", ")}</span>
      </>
    )}
    {webhook.SideEffects && (
      <>
        <span className="text-h3 text-muted-foreground">Side Effects</span>
        <span className="text-body">{webhook.SideEffects}</span>
      </>
    )}
    {webhook.TimeoutSeconds > 0 && (
      <>
        <span className="text-h3 text-muted-foreground">Timeout Seconds</span>
        <span className="text-body">{webhook.TimeoutSeconds}</span>
      </>
    )}
    {webhook.NamespaceSelectorExpressions && (
      <>
        <span className="text-h3 text-muted-foreground">Namespace Selector</span>
        <span className="text-body">{webhook.NamespaceSelectorExpressions}</span>
      </>
    )}
    {webhook.ObjectSelectorExpressions && (
      <>
        <span className="text-h3 text-muted-foreground">Object Selector</span>
        <span className="text-body">{webhook.ObjectSelectorExpressions}</span>
      </>
    )}
    {(webhook.RulesAPIGroups.length > 0 ||
      webhook.RulesAPIVersions.length > 0 ||
      webhook.RulesOperations.length > 0 ||
      webhook.RulesResources.length > 0) && (
      <>
        <span className="text-h3 text-muted-foreground">Rules</span>
        <div className="text-body font-mono whitespace-pre-wrap">
          {webhook.RulesAPIGroups.length > 0 &&
            `API Groups: ${webhook.RulesAPIGroups.join(", ")}\n`}
          {webhook.RulesAPIVersions.length > 0 &&
            `API Versions: ${webhook.RulesAPIVersions.join(", ")}\n`}
          {webhook.RulesOperations.length > 0 &&
            `Operations: ${webhook.RulesOperations.join(", ")}\n`}
          {webhook.RulesResources.length > 0 && `Resources: ${webhook.RulesResources.join(", ")}\n`}
          {webhook.RulesScope && `Scope: ${webhook.RulesScope}`}
        </div>
      </>
    )}
  </div>
);

const ValidatingWebhookConfigOverviewTab: FC<{ vwc: ValidatingWebhookConfigDetail }> = ({
  vwc,
}) => {
  return (
    <ScrollArea className="h-full">
      {/* Metadata */}
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {new Date(vwc.CreatedAt).toLocaleString()} ({vwc.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{vwc.Name}</span>

        <span className="text-h3 text-muted-foreground">API Version</span>
        <span className="text-body font-mono">{vwc.APIVersion}</span>

        <span className="text-h3 text-muted-foreground">Labels</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(vwc.Labels ?? {}).length > 0 ? (
            Object.entries(vwc.Labels).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>

        <span className="text-h3 text-muted-foreground">Annotations</span>
        <div className="flex flex-wrap gap-1">
          {Object.keys(vwc.Annotations ?? {}).length > 0 ? (
            Object.entries(vwc.Annotations).map(([k, v]) => (
              <AnnotationBadge key={k} label={`${k}=${v}`} />
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {/* Webhooks */}
      <SectionDivider label="Webhooks" className="tracking-wide uppercase" />
      {(() => {
        const webhooks = vwc.Webhooks ?? [];
        return webhooks.length === 0 ? (
          <p className="px-4 py-2 text-xs text-muted-foreground">No webhooks</p>
        ) : (
          webhooks.map((webhook) => (
            <div key={webhook.Name} className="border-t border-muted/40 first:border-0">
              <div className="p-4">
                <WebhookBlock webhook={webhook} />
              </div>
            </div>
          ))
        );
      })()}
    </ScrollArea>
  );
};

const ValidatingWebhookConfigEventsTab: FC<{ vwc: ValidatingWebhookConfigDetail }> = ({ vwc }) => {
  const { activeContext } = useMainLayoutContext();
  const { data: events = [] } = useGetEvents({ context: activeContext, namespaces: [] });
  const vwcEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "validatingwebhookconfiguration" &&
      e.InvolvedObjectName === vwc.Name
  );
  return (
    <ScrollArea className="h-full">
      <EventsTable events={vwcEvents} />
    </ScrollArea>
  );
};

interface ValidatingWebhookConfigDrawerCtaButtonsProps {
  vwcName: string;
  onClose: () => void;
}

const ValidatingWebhookConfigDrawerCtaButtons: FC<ValidatingWebhookConfigDrawerCtaButtonsProps> = ({
  vwcName,
  onClose,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteValidatingWebhookConfig, isPending: isDeletePending } =
    useDeleteValidatingWebhookConfig();

  const handleDeleteConfirm = () => {
    deleteValidatingWebhookConfig(
      { name: vwcName },
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
            ariaLabel="Edit Validating Webhook Configuration"
            onClick={() =>
              openTab("modification", { kind: "ValidatingWebhookConfig", name: vwcName })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete Validating Webhook Configuration"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <ValidatingWebhookConfigDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={vwcName}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

interface ValidatingWebhookConfigDetailDrawerProps {
  vwcName: string | null;
  open: boolean;
  onClose: () => void;
}

const ValidatingWebhookConfigDrawerBody: FC<
  ValidatingWebhookConfigDetailDrawerProps & {
    vwcName: string;
    onDataChange: (vwc: ValidatingWebhookConfigDetail | undefined) => void;
  }
> = ({ vwcName, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();
  const [eventsVisible, setEventsVisible] = useState(false);

  const { data: vwc, isLoading } = useGetValidatingWebhookConfigDetail(activeContext, vwcName);
  useCatchForbiddenResource("validatingwebhookconfigs", {
    open,
    resourceName: vwcName,
    resourceLabel: "Validating Webhook Configuration",
    onForbiddenDetected: onClose,
  });

  useEffect(() => {
    onDataChange(vwc);
  }, [vwc, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!vwc) {
    return <ResourceDetailEmptyBody resourceKind="ValidatingWebhookConfiguration" />;
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
        <ValidatingWebhookConfigOverviewTab vwc={vwc} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <ValidatingWebhookConfigEventsTab vwc={vwc} />}
      </TabsContent>
    </Tabs>
  );
};

export const ValidatingWebhookConfigDetailDrawer: FC<ValidatingWebhookConfigDetailDrawerProps> = ({
  vwcName,
  open,
  onClose,
}) => {
  const [vwc, setVwc] = useState<ValidatingWebhookConfigDetail | undefined>(undefined);

  const hasData = !!vwcName;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">
          Validating Webhook Configuration: {vwc?.Name ?? vwcName}
        </SheetTitle>
        {vwc && <ValidatingWebhookConfigDrawerCtaButtons vwcName={vwc.Name} onClose={onClose} />}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <ValidatingWebhookConfigDrawerBody
          key={vwcName}
          vwcName={vwcName}
          open={open}
          onClose={onClose}
          onDataChange={setVwc}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Validating Webhook Configuration" />
      )}
    </ResourceDetailDrawer>
  );
};
