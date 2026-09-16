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
import { useResourceLinks } from "../../../../shared/hooks/useResourceLinks";
import { EventsTable } from "../../../base/events/components/EventsTable";
import { useGetEvents } from "../../../base/events/hooks/data-access/useGetEvents";
import { PodSimpleTable } from "../../pods/components/PodSimpleTable";
import { PodStatusBadge } from "../../pods/components/PodStatusBadge";
import { useGetPods } from "../../pods/hooks/data-access/useGetPods";
import type { Job } from "../api/resources";
import { useGetJobDetail } from "../hooks/data-access/useGetJobDetail";
import { useDeleteJob } from "../hooks/data-mutation/useDeleteJob";
import { JobConditionBadge } from "./JobConditionBadge";
import { JobDeleteConfirmationModal } from "./JobDeleteConfirmationModal";
import { JobResumedBadge } from "./JobResumedBadge";

const JobOverviewTab: FC<{ j: Job }> = ({ j }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  const resourceLinks = useResourceLinks();

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {j.Age} ago ({j.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{j.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(j.Namespace)}>
          {j.Namespace}
        </ResourceLink>

        {Object.keys(j.Labels ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Labels</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(j.Labels).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {Object.keys(j.Annotations ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Annotations</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(j.Annotations).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {(j.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {j.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        {j.OwnerKind && (
          <>
            <span className="text-h3 text-muted-foreground">Controlled by</span>
            <span className="text-body font-mono">
              {j.OwnerKind}:{" "}
              {resourceLinks[j.OwnerKind.toLowerCase()] ? (
                <ResourceLink
                  onClick={() => resourceLinks[j.OwnerKind.toLowerCase()](j.Namespace, j.OwnerName)}
                >
                  {j.OwnerName}
                </ResourceLink>
              ) : (
                j.OwnerName
              )}
            </span>
          </>
        )}

        {Object.keys(j.Selector ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Selector</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(j.Selector).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Status</span>
        <JobConditionBadge condition={j.Status} />

        <span className="text-h3 text-muted-foreground">Parallelism</span>
        <span className="text-body font-mono">{j.Parallelism}</span>

        <span className="text-h3 text-muted-foreground">Completions</span>
        <span className="text-body font-mono">{j.Completions}</span>

        <span className="text-h3 text-muted-foreground">Completion Mode</span>
        <span className="text-body font-mono">{j.CompletionMode}</span>

        <span className="text-h3 text-muted-foreground">Resumed</span>
        <JobResumedBadge resumed={j.Resumed} />

        {j.StartTime && (
          <>
            <span className="text-h3 text-muted-foreground">Start Time</span>
            <span className="text-body font-mono">
              {j.StartTimeAge} ago ({j.StartTime})
            </span>
          </>
        )}

        {j.CompletedAt && (
          <>
            <span className="text-h3 text-muted-foreground">Completed At</span>
            <span className="text-body font-mono">
              {j.CompletedAtAge} ago ({j.CompletedAt})
            </span>
          </>
        )}

        {j.Duration && (
          <>
            <span className="text-h3 text-muted-foreground">Duration</span>
            <span className="text-body font-mono">{j.Duration}</span>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Pods Statuses</span>
        <div className="flex flex-wrap gap-1">
          {j.PodsStatuses.map((status) => (
            <PodStatusBadge key={status} status={status} />
          ))}
        </div>

        {(j.Conditions ?? []).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Conditions</span>
            <div className="flex flex-wrap gap-1">
              {j.Conditions.map((c) => (
                <JobConditionBadge key={c.Type} condition={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

const JobPodsTab: FC<{ j: Job }> = ({ j }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: allPods = [] } = useGetPods({ context: activeContext, namespaces: [j.Namespace] });
  const pods = allPods
    .filter(
      (p) =>
        p.ControlledBy === "Job" && p.ControlledByName === j.Name && p.Namespace === j.Namespace
    )
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  return <PodSimpleTable pods={pods} />;
};

interface JobDrawerCtaButtonsProps {
  jobName: string;
  jobNamespace: string;
  onClose: () => void;
}

const JobDrawerCtaButtons: FC<JobDrawerCtaButtonsProps> = ({ jobName, jobNamespace, onClose }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteJob, isPending: isDeletePending } = useDeleteJob();

  const handleDeleteConfirm = () => {
    deleteJob(
      { namespace: jobNamespace, name: jobName },
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
            ariaLabel="Edit Job"
            onClick={() =>
              openTab("modification", { kind: "Job", name: jobName, namespace: jobNamespace })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete Job"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </ButtonGroup>
      </TooltipProvider>

      <JobDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={jobName}
        namespace={jobNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

const JobEventsTab: FC<{ j: Job }> = ({ j }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: events = [] } = useGetEvents({ context: activeContext, namespaces: [j.Namespace] });
  const jobEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "job" &&
      e.InvolvedObjectName === j.Name &&
      e.Namespace === j.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={jobEvents} />
    </ScrollArea>
  );
};

interface JobDetailDrawerProps {
  jobName: string | null;
  jobNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const JobDrawerBody: FC<
  JobDetailDrawerProps & {
    jobName: string;
    jobNamespace: string;
    onDataChange: (job: Job | undefined) => void;
  }
> = ({ jobName, jobNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: job, isLoading } = useGetJobDetail(activeContext, jobNamespace, jobName);
  useCatchForbiddenResource("jobs", {
    open,
    resourceName: jobName,
    resourceLabel: "Job",
    namespace: jobNamespace,
    onForbiddenDetected: onClose,
  });

  const [eventsVisible, setEventsVisible] = useState(false);

  useEffect(() => {
    onDataChange(job);
  }, [job, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!job) {
    return <ResourceDetailEmptyBody resourceKind="Job" />;
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
        <JobOverviewTab j={job} />
      </TabsContent>
      <TabsContent value="pods" className="mt-0 min-h-0 flex-1">
        <JobPodsTab j={job} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <JobEventsTab j={job} />}
      </TabsContent>
    </Tabs>
  );
};

export const JobDetailDrawer: FC<JobDetailDrawerProps> = ({
  jobName,
  jobNamespace,
  open,
  onClose,
}) => {
  const [job, setJob] = useState<Job | undefined>(undefined);

  const hasData = !!jobName && !!jobNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">Job: {job?.Name ?? jobName}</SheetTitle>
        {job && (
          <JobDrawerCtaButtons jobName={job.Name} jobNamespace={job.Namespace} onClose={onClose} />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <JobDrawerBody
          key={jobName}
          jobName={jobName}
          jobNamespace={jobNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setJob}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="Job" />
      )}
    </ResourceDetailDrawer>
  );
};
