import {
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  MoreVerticalIcon,
  ResourceBulkDeletionButton,
  ResourceDeletionButton,
  ResourceExplanationTooltip,
  ResourceLink,
  ResourceModificationButton,
  ResourceResumeButton,
  ResourceRunNowButton,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSkeletonLoader,
  TimerIcon,
} from "@galacius/design-system";
import { FC, useMemo, useState } from "react";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { CronJobCreateJobConfirmationModal } from "./components/CronJobCreateJobConfirmationModal";
import { CronJobDeleteConfirmationModal } from "./components/CronJobDeleteConfirmationModal";
import { CronJobResumeConfirmationModal } from "./components/CronJobResumeConfirmationModal";
import { CronJobResumedBadge } from "./components/CronJobResumedBadge";
import { useGetCronJobs } from "./hooks/data-access/useGetCronJobs";
import { useCreateJobFromCronJob } from "./hooks/data-mutation/useCreateJobFromCronJob";
import { useDeleteCronJob } from "./hooks/data-mutation/useDeleteCronJob";
import { useDeleteCronJobs } from "./hooks/data-mutation/useDeleteCronJobs";
import { useSetCronJobSuspend } from "./hooks/data-mutation/useSetCronJobSuspend";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

interface CronJobTableCtaButtonsProps {
  name: string;
  namespace: string;
  suspended: boolean;
}

const CronJobTableCtaButtons: FC<CronJobTableCtaButtonsProps> = ({
  namespace,
  name,
  suspended,
}) => {
  const { openTab } = useUnifiedTray();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);

  const { mutate: deleteCronJob, isPending: isDeletePending } = useDeleteCronJob();
  const { mutate: setCronJobSuspend, isPending: isResumePending } = useSetCronJobSuspend();
  const { mutate: createJobFromCronJob, isPending: isCreateJobPending } = useCreateJobFromCronJob();

  const handleDeleteConfirm = () => {
    deleteCronJob({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
  };

  const handleResumeConfirm = () => {
    setCronJobSuspend(
      { namespace, name, suspend: false },
      { onSuccess: () => setShowResumeModal(false) }
    );
  };

  const handleCreateJobConfirm = () => {
    createJobFromCronJob({ namespace, name }, { onSuccess: () => setShowCreateJobModal(false) });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Actions"
          className="flex size-6 cursor-pointer items-center justify-center rounded-sm hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVerticalIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ResourceRunNowButton
            disabled={isCreateJobPending}
            onClick={() => setShowCreateJobModal(true)}
          />
          <ResourceResumeButton
            disabled={!suspended || isResumePending}
            onClick={() => setShowResumeModal(true)}
          />
          <ResourceModificationButton
            onClick={() => openTab("modification", { kind: "CronJob", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <CronJobDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        namespace={namespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      <CronJobResumeConfirmationModal
        open={showResumeModal}
        name={name}
        namespace={namespace}
        isPending={isResumePending}
        onClose={() => setShowResumeModal(false)}
        onConfirm={handleResumeConfirm}
      />

      <CronJobCreateJobConfirmationModal
        open={showCreateJobModal}
        name={name}
        namespace={namespace}
        isPending={isCreateJobPending}
        onClose={() => setShowCreateJobModal(false)}
        onConfirm={handleCreateJobConfirm}
      />
    </>
  );
};

export const CronJobsView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const [search, setSearch] = useState("");
  const [selectedCronJobIds, setSelectedCronJobIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleCronJobDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleCronJobDetail: v.onToggleCronJobDetail,
  }));

  const { mutate: deleteCronJobs, isPending: isBulkDeletePending } = useDeleteCronJobs();

  const { data: raw = [], isLoading } = useGetCronJobs({ context: activeContext, namespaces });

  const cronjobs = useMemo(
    () =>
      raw
        .filter((cj) => !search || cj.Name.toLowerCase().includes(search.toLowerCase()))
        .toSorted((a, b) => a.Name.localeCompare(b.Name)),
    [raw, search]
  );

  const {
    visibleItems: visibleCronJobs,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(cronjobs, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Cron Jobs</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-lg" }}
          description="A CronJob creates Jobs on a repeating schedule, similar to a cron entry on a Unix system."
          docsUrl="https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs"
        />
        <span className="text-xs text-muted-foreground">
          {cronjobs.length} item{cronjobs.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedCronJobIds.size}
            ariaLabel="Delete selected cron jobs"
            tooltip="Delete selected CronJobs"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Cron Jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="w-68"
          />
        </div>
      </div>

      <Table containerClassName="flex-1 overflow-y-auto">
        <TableHeader className="z-sticky sticky top-0 bg-background">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={
                  visibleCronJobs.length > 0 &&
                  visibleCronJobs.every((cj) =>
                    selectedCronJobIds.has(`${cj.Namespace}/${cj.Name}`)
                  )
                }
                indeterminate={
                  visibleCronJobs.some((cj) =>
                    selectedCronJobIds.has(`${cj.Namespace}/${cj.Name}`)
                  ) &&
                  !visibleCronJobs.every((cj) =>
                    selectedCronJobIds.has(`${cj.Namespace}/${cj.Name}`)
                  )
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedCronJobIds);
                    visibleCronJobs.forEach((cj) => newSelection.add(`${cj.Namespace}/${cj.Name}`));
                    setSelectedCronJobIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedCronJobIds);
                    visibleCronJobs.forEach((cj) =>
                      newSelection.delete(`${cj.Namespace}/${cj.Name}`)
                    );
                    setSelectedCronJobIds(newSelection);
                  }
                }}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Schedule</TableHead>
            <TableHead>Timezone</TableHead>
            <TableHead>Resumed</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Last schedule</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 8 : 7}
              includeCheckbox={true}
              columnWidths={[
                "w-[65%]",
                "w-[55%]",
                "w-[45%]",
                "w-[35%]",
                "w-[30%]",
                "w-[30%]",
                "w-[40%]",
                "w-[30%]",
              ]}
            />
          ) : visibleCronJobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 10 : 9} className="px-0 py-0">
                <EmptyState
                  icon={<TimerIcon className="size-8" />}
                  title="No CronJobs"
                  description="Create a CronJob to run scheduled tasks"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleCronJobs.map((cj) => (
              <TableRow
                key={`${cj.Namespace}/${cj.Name}`}
                onClick={() => onToggleCronJobDetail(cj.Namespace, cj.Name)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedCronJobIds.has(`${cj.Namespace}/${cj.Name}`)}
                    onCheckedChange={(checked) => {
                      const newSelection = new Set(selectedCronJobIds);
                      if (checked) {
                        newSelection.add(`${cj.Namespace}/${cj.Name}`);
                      } else {
                        newSelection.delete(`${cj.Namespace}/${cj.Name}`);
                      }
                      setSelectedCronJobIds(newSelection);
                    }}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{cj.Name}</TableCell>
                {namespaces.length !== 1 && (
                  <TableCell className="text-xs">
                    <ResourceLink
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleNamespaceDetail(cj.Namespace);
                      }}
                    >
                      {cj.Namespace}
                    </ResourceLink>
                  </TableCell>
                )}
                <TableCell className="font-mono text-xs">{cj.Schedule}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {cj.Timezone || "—"}
                </TableCell>
                <TableCell className="text-xs">
                  <CronJobResumedBadge resumed={!cj.Suspend} />
                </TableCell>
                <TableCell className="text-xs">{cj.Active}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {cj.LastSchedule || "—"}
                </TableCell>
                <TableCell className="text-xs">{cj.Age}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <CronJobTableCtaButtons
                    name={cj.Name}
                    namespace={cj.Namespace}
                    suspended={cj.Suspend}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {isPaginated && (
        <TablePagination
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          totalItems={cronjobs.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedCronJobIds.size > 0 && (
        <CronJobDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedCronJobIds).map((key) => {
            const [ns, name] = key.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedCronJobIds).map((key) => {
              const [ns, name] = key.split("/");
              return { namespace: ns, name };
            });
            deleteCronJobs(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedCronJobIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
