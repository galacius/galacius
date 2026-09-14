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
  ResourceResumeButton,
  ResourceRunNowButton,
  ScrollArea,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { JobConditionBadge } from "../../jobs/components/JobConditionBadge";
import { JobResumedBadge } from "../../jobs/components/JobResumedBadge";
import { useGetJobs } from "../../jobs/hooks/data-access/useGetJobs";
import type { CronJob } from "../api/resources";
import { useGetCronJobDetail } from "../hooks/data-access/useGetCronJobDetail";
import { useCreateJobFromCronJob } from "../hooks/data-mutation/useCreateJobFromCronJob";
import { useDeleteCronJob } from "../hooks/data-mutation/useDeleteCronJob";
import { useSetCronJobSuspend } from "../hooks/data-mutation/useSetCronJobSuspend";
import { getCronDescription } from "../utils/cronDescription";
import { CronJobCreateJobConfirmationModal } from "./CronJobCreateJobConfirmationModal";
import { CronJobDeleteConfirmationModal } from "./CronJobDeleteConfirmationModal";
import { CronJobResumeConfirmationModal } from "./CronJobResumeConfirmationModal";
import { CronJobResumedBadge } from "./CronJobResumedBadge";

const CronJobOverviewTab: FC<{ cj: CronJob }> = ({ cj }) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));
  const cronDescription = cj.Schedule ? getCronDescription(cj.Schedule) : null;
  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-x-4 gap-y-3 p-4">
        <span className="text-h3 text-muted-foreground">Created</span>
        <span className="text-body font-mono">
          {cj.Age} ago ({cj.CreatedAt})
        </span>

        <span className="text-h3 text-muted-foreground">Name</span>
        <span className="text-body font-mono">{cj.Name}</span>

        <span className="text-h3 text-muted-foreground">Namespace</span>
        <ResourceLink onClick={() => onToggleNamespaceDetail(cj.Namespace)}>
          {cj.Namespace}
        </ResourceLink>

        {Object.keys(cj.Annotations ?? {}).length > 0 && (
          <>
            <span className="text-h3 text-muted-foreground">Annotations</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(cj.Annotations!).map(([k, v]) => (
                <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
              ))}
            </div>
          </>
        )}

        {(cj.ManagedFields ?? []).length > 0 && (
          <>
            <span className="text-h3 self-start pt-0.5 text-muted-foreground">Managed Fields</span>
            <div className="flex min-w-0 flex-col gap-2">
              {cj.ManagedFields.map((mf) => (
                <ManagedFieldBlock key={`${mf.Manager}/${mf.Operation}`} mf={mf} />
              ))}
            </div>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Schedule</span>
        <div className="flex min-w-0 flex-wrap items-baseline gap-2">
          <span className="text-body font-mono">{cj.Schedule}</span>
          {cronDescription && (
            <span className="text-body text-muted-foreground/70">({cronDescription})</span>
          )}
        </div>

        <span className="text-h3 text-muted-foreground">Timezone</span>
        <span className="text-body font-mono">{cj.Timezone || "—"}</span>

        <span className="text-h3 text-muted-foreground">Concurrency Policy</span>
        <span className="text-body font-mono">{cj.ConcurrencyPolicy}</span>

        <span className="text-h3 text-muted-foreground">Resumed</span>
        <CronJobResumedBadge resumed={!cj.Suspend} />

        <span className="text-h3 text-muted-foreground">Successful Jobs History Limit</span>
        <span className="text-body font-mono">{cj.SuccessfulJobsHistoryLimit}</span>

        <span className="text-h3 text-muted-foreground">Failed Jobs History Limit</span>
        <span className="text-body font-mono">{cj.FailedJobsHistoryLimit}</span>

        <span className="text-h3 text-muted-foreground">Last Schedule</span>
        <span className="text-body font-mono">
          {cj.LastScheduleAt ? `${cj.LastSchedule} ago (${cj.LastScheduleAt})` : "—"}
        </span>

        {cj.LastSuccessfulTimeAt && (
          <>
            <span className="text-h3 text-muted-foreground">Last Successful Run</span>
            <span className="text-body font-mono">
              {cj.LastSuccessfulTime} ago ({cj.LastSuccessfulTimeAt})
            </span>
          </>
        )}

        <span className="text-h3 text-muted-foreground">Active</span>
        <span className="text-body font-mono">{cj.Active}</span>

        <SectionDivider
          label="Template"
          className="col-span-2 -mx-4 border-y-0 bg-muted/50 tracking-wide uppercase"
        />

        <span className="text-h3 text-muted-foreground">Parallelism</span>
        <span className="text-body font-mono">
          {cj.JobParallelism === 0 ? "—" : cj.JobParallelism}
        </span>

        <span className="text-h3 text-muted-foreground">Completions</span>
        <span className="text-body font-mono">{cj.JobCompletions}</span>

        <span className="text-h3 text-muted-foreground">Job Resumed</span>
        <JobResumedBadge resumed={!cj.JobSuspend} />

        <span className="text-h3 text-muted-foreground">TTL Seconds After Finished</span>
        <span className="text-body font-mono">{cj.JobTTLSecondsAfterFinished}s</span>
      </div>
    </ScrollArea>
  );
};

interface CronJobDrawerCtaButtonsProps {
  cronJobName: string;
  cronJobNamespace: string;
  suspended: boolean;
  onClose: () => void;
}

const CronJobDrawerCtaButtons: FC<CronJobDrawerCtaButtonsProps> = ({
  cronJobName,
  cronJobNamespace,
  suspended,
  onClose,
}) => {
  const { openTab } = useUnifiedTray();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);

  const { mutate: deleteCronJob, isPending: isDeletePending } = useDeleteCronJob();
  const { mutate: setCronJobSuspend, isPending: isResumePending } = useSetCronJobSuspend();
  const { mutate: createJobFromCronJob, isPending: isCreateJobPending } = useCreateJobFromCronJob();

  const handleDeleteConfirm = () => {
    deleteCronJob(
      { namespace: cronJobNamespace, name: cronJobName },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          onClose();
        },
      }
    );
  };

  const handleResumeConfirm = () => {
    setCronJobSuspend(
      { namespace: cronJobNamespace, name: cronJobName, suspend: false },
      { onSuccess: () => setShowResumeModal(false) }
    );
  };

  const handleCreateJobConfirm = () => {
    createJobFromCronJob(
      { namespace: cronJobNamespace, name: cronJobName },
      { onSuccess: () => setShowCreateJobModal(false) }
    );
  };

  return (
    <>
      <ButtonGroup>
        <TooltipProvider>
          <ResourceRunNowButton
            mode="icon-button"
            ariaLabel="Run CronJob now"
            disabled={isCreateJobPending}
            onClick={() => setShowCreateJobModal(true)}
          />
          <ResourceResumeButton
            mode="icon-button"
            ariaLabel="Resume CronJob"
            disabled={!suspended || isResumePending}
            onClick={() => setShowResumeModal(true)}
          />
          <ResourceModificationButton
            mode="icon-button"
            ariaLabel="Edit CronJob"
            onClick={() =>
              openTab("modification", {
                kind: "CronJob",
                name: cronJobName,
                namespace: cronJobNamespace,
              })
            }
          />
          <ResourceDeletionButton
            mode="icon-button"
            ariaLabel="Delete CronJob"
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </TooltipProvider>
      </ButtonGroup>

      <CronJobDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={cronJobName}
        namespace={cronJobNamespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      <CronJobResumeConfirmationModal
        open={showResumeModal}
        name={cronJobName}
        namespace={cronJobNamespace}
        isPending={isResumePending}
        onClose={() => setShowResumeModal(false)}
        onConfirm={handleResumeConfirm}
      />

      <CronJobCreateJobConfirmationModal
        open={showCreateJobModal}
        name={cronJobName}
        namespace={cronJobNamespace}
        isPending={isCreateJobPending}
        onClose={() => setShowCreateJobModal(false)}
        onConfirm={handleCreateJobConfirm}
      />
    </>
  );
};

const CronJobJobsTab: FC<{ cj: CronJob }> = ({ cj }) => {
  const { activeContext } = useMainLayoutContext();
  const { onToggleJobDetail } = useDetailDrawerContext((v) => ({
    onToggleJobDetail: v.onToggleJobDetail,
  }));
  const { data: allJobs = [] } = useGetJobs({ context: activeContext, namespaces: [cj.Namespace] });
  const jobs = allJobs
    .filter((j) => {
      if (!j.Name.startsWith(cj.Name + "-") || j.Namespace !== cj.Namespace) return false;
      const suffix = j.Name.slice(cj.Name.length + 1);
      return /^\d+$/.test(suffix);
    })
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  return (
    <ScrollArea className="h-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs">Condition</TableHead>
            <TableHead className="text-xs">Selector</TableHead>
            <TableHead className="text-xs">Start Time</TableHead>
            <TableHead className="text-xs">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                Item list is empty
              </TableCell>
            </TableRow>
          ) : (
            jobs.map((j) => (
              <TableRow key={`${j.Namespace}/${j.Name}`}>
                <TableCell className="max-w-40 truncate font-mono text-xs">
                  <ResourceLink
                    truncate
                    truncateTextClassName="max-w-40"
                    onClick={() => onToggleJobDetail(j.Namespace, j.Name)}
                  >
                    {j.Name}
                  </ResourceLink>
                </TableCell>
                <TableCell>
                  <JobConditionBadge condition={j.Status} />
                </TableCell>
                <TableCell className="max-w-40 truncate font-mono text-xs">
                  {Object.entries(j.Selector ?? {})
                    .map(([k, v]) => (v ? `${k}=${v}` : k))
                    .join(", ")}
                </TableCell>
                <TableCell className="font-mono text-xs">{j.StartTime || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{j.Duration || "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

const CronJobEventsTab: FC<{ cj: CronJob }> = ({ cj }) => {
  const { activeContext } = useMainLayoutContext();
  const { data: events = [] } = useGetEvents({
    context: activeContext,
    namespaces: [cj.Namespace],
  });
  const cronJobEvents = events.filter(
    (e) =>
      e.InvolvedObjectKind.toLowerCase() === "cronjob" &&
      e.InvolvedObjectName === cj.Name &&
      e.Namespace === cj.Namespace
  );

  return (
    <ScrollArea className="h-full">
      <EventsTable events={cronJobEvents} />
    </ScrollArea>
  );
};

interface CronJobDetailDrawerProps {
  cronJobName: string | null;
  cronJobNamespace: string | null;
  open: boolean;
  onClose: () => void;
}

const CronJobDrawerBody: FC<
  CronJobDetailDrawerProps & {
    cronJobName: string;
    cronJobNamespace: string;
    onDataChange: (cronJob: CronJob | undefined) => void;
  }
> = ({ cronJobName, cronJobNamespace, open, onClose, onDataChange }) => {
  const { activeContext } = useMainLayoutContext();

  const { data: cronJob, isLoading } = useGetCronJobDetail(
    activeContext,
    cronJobNamespace,
    cronJobName
  );
  useCatchForbiddenResource("cronjobs", {
    open,
    resourceName: cronJobName,
    resourceLabel: "CronJob",
    namespace: cronJobNamespace,
    onForbiddenDetected: onClose,
  });

  const [eventsVisible, setEventsVisible] = useState(false);

  useEffect(() => {
    onDataChange(cronJob?.Name ? cronJob : undefined);
  }, [cronJob, onDataChange]);

  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }

  if (!cronJob?.Name) {
    return <ResourceDetailEmptyBody resourceKind="CronJob" />;
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
        <TabsTrigger value="jobs" className="text-xs">
          Jobs
        </TabsTrigger>
        <TabsTrigger value="events" className="text-xs">
          Events
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-0 min-h-0 flex-1">
        <CronJobOverviewTab cj={cronJob} />
      </TabsContent>
      <TabsContent value="jobs" className="mt-0 min-h-0 flex-1">
        <CronJobJobsTab cj={cronJob} />
      </TabsContent>
      <TabsContent value="events" className="mt-0 min-h-0 flex-1">
        {eventsVisible && <CronJobEventsTab cj={cronJob} />}
      </TabsContent>
    </Tabs>
  );
};

export const CronJobDetailDrawer: FC<CronJobDetailDrawerProps> = ({
  cronJobName,
  cronJobNamespace,
  open,
  onClose,
}) => {
  const [cronJob, setCronJob] = useState<CronJob | undefined>(undefined);

  const hasData = !!cronJobName && !!cronJobNamespace;

  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      <ResourceDetailDrawerHeader>
        <SheetTitle className="text-h1">CronJob: {cronJob?.Name ?? cronJobName}</SheetTitle>
        {cronJob && (
          <CronJobDrawerCtaButtons
            cronJobName={cronJob.Name}
            cronJobNamespace={cronJob.Namespace}
            suspended={cronJob.Suspend}
            onClose={onClose}
          />
        )}
      </ResourceDetailDrawerHeader>

      {hasData ? (
        <CronJobDrawerBody
          key={cronJobName}
          cronJobName={cronJobName}
          cronJobNamespace={cronJobNamespace}
          open={open}
          onClose={onClose}
          onDataChange={setCronJob}
        />
      ) : (
        <ResourceDetailEmptyBody resourceKind="CronJob" />
      )}
    </ResourceDetailDrawer>
  );
};
