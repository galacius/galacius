import {
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  ListChecksIcon,
  MoreVerticalIcon,
  ResourceBulkDeletionButton,
  ResourceDeletionButton,
  ResourceExplanationTooltip,
  ResourceLink,
  ResourceModificationButton,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSkeletonLoader,
} from "@galacius/design-system";
import { FC, useMemo, useState } from "react";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { JobConditionBadge } from "./components/JobConditionBadge";
import { JobDeleteConfirmationModal } from "./components/JobDeleteConfirmationModal";
import { JobResumedBadge } from "./components/JobResumedBadge";
import { useGetJobs } from "./hooks/data-access/useGetJobs";
import { useDeleteJob } from "./hooks/data-mutation/useDeleteJob";
import { useDeleteJobs } from "./hooks/data-mutation/useDeleteJobs";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

interface JobTableCtaButtonsProps {
  name: string;
  namespace: string;
}

const JobTableCtaButtons: FC<JobTableCtaButtonsProps> = ({ namespace, name }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteJob, isPending: isDeletePending } = useDeleteJob();

  const handleDeleteConfirm = () => {
    deleteJob({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
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
          <ResourceModificationButton
            onClick={() => openTab("modification", { kind: "Job", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <JobDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        name={name}
        namespace={namespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

export const JobsView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleJobDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleJobDetail: v.onToggleJobDetail,
  }));

  const [search, setSearch] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { mutate: deleteJobs, isPending: isBulkDeletePending } = useDeleteJobs();

  const { data: raw = [], isLoading } = useGetJobs({ context: activeContext, namespaces });

  const jobs = useMemo(
    () =>
      raw
        .filter((j) => !search || j.Name.toLowerCase().includes(search.toLowerCase()))
        .toSorted((a, b) => a.Name.localeCompare(b.Name)),
    [raw, search]
  );

  const {
    visibleItems: visibleJobs,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(jobs, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Jobs</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          description="A Job creates one or more Pods and ensures a specified number of them successfully terminate, used for run-to-completion tasks."
          docsUrl="https://kubernetes.io/docs/concepts/workloads/controllers/job"
        />
        <span className="text-xs text-muted-foreground">
          {jobs.length} item{jobs.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedJobIds.size}
            ariaLabel="Delete selected jobs"
            tooltip="Delete selected Jobs"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Jobs..."
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
                  visibleJobs.length > 0 &&
                  visibleJobs.every((j) => selectedJobIds.has(`${j.Namespace}/${j.Name}`))
                }
                indeterminate={
                  visibleJobs.some((j) => selectedJobIds.has(`${j.Namespace}/${j.Name}`)) &&
                  !visibleJobs.every((j) => selectedJobIds.has(`${j.Namespace}/${j.Name}`))
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedJobIds);
                    visibleJobs.forEach((j) => newSelection.add(`${j.Namespace}/${j.Name}`));
                    setSelectedJobIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedJobIds);
                    visibleJobs.forEach((j) => newSelection.delete(`${j.Namespace}/${j.Name}`));
                    setSelectedJobIds(newSelection);
                  }
                }}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Resumed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Succeeded</TableHead>
            <TableHead>Completions</TableHead>
            <TableHead>Parallelism</TableHead>
            <TableHead>Duration</TableHead>
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
                "w-[30%]",
                "w-[35%]",
                "w-[30%]",
                "w-[30%]",
                "w-[30%]",
                "w-[30%]",
              ]}
            />
          ) : visibleJobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 11 : 10} className="px-0 py-0">
                <EmptyState
                  icon={<ListChecksIcon className="size-8" />}
                  title="No Jobs"
                  description="Create a Job to run a task to completion"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleJobs.map((j) => (
              <TableRow
                key={`${j.Namespace}/${j.Name}`}
                className="cursor-pointer"
                onClick={() => onToggleJobDetail(j.Namespace, j.Name)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedJobIds.has(`${j.Namespace}/${j.Name}`)}
                    onCheckedChange={(checked) => {
                      const newSelection = new Set(selectedJobIds);
                      if (checked) {
                        newSelection.add(`${j.Namespace}/${j.Name}`);
                      } else {
                        newSelection.delete(`${j.Namespace}/${j.Name}`);
                      }
                      setSelectedJobIds(newSelection);
                    }}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{j.Name}</TableCell>
                {namespaces.length !== 1 && (
                  <TableCell className="text-xs">
                    <ResourceLink
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleNamespaceDetail(j.Namespace);
                      }}
                    >
                      {j.Namespace}
                    </ResourceLink>
                  </TableCell>
                )}
                <TableCell className="text-xs">
                  <JobResumedBadge resumed={j.Resumed} />
                </TableCell>
                <TableCell>
                  <JobConditionBadge condition={j.Status} />
                </TableCell>
                <TableCell className="text-xs">{j.Succeeded}</TableCell>
                <TableCell className="text-xs">{j.Completions}</TableCell>
                <TableCell className="text-xs">{j.Parallelism}</TableCell>
                <TableCell className="text-xs">{j.Duration}</TableCell>
                <TableCell className="text-xs">{j.Age}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <JobTableCtaButtons name={j.Name} namespace={j.Namespace} />
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
          totalItems={jobs.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedJobIds.size > 0 && (
        <JobDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedJobIds).map((key) => {
            const [ns, name] = key.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedJobIds).map((key) => {
              const [ns, name] = key.split("/");
              return { namespace: ns, name };
            });
            deleteJobs(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedJobIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
