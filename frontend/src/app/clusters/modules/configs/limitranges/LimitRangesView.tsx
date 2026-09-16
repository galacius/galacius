import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  MoreVerticalIcon,
  ResourceBulkDeletionButton,
  ResourceCreationButton,
  ResourceDeletionButton,
  ResourceExplanationTooltip,
  ResourceLink,
  ResourceModificationButton,
  SearchInput,
  SlidersHorizontalIcon,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSkeletonLoader,
  cn,
} from "@galacius/design-system";
import { FC, useState } from "react";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { LimitRangeCreationModal } from "./components/LimitRangeCreationModal";
import { LimitRangeDeleteConfirmationModal } from "./components/LimitRangeDeleteConfirmationModal";
import { useGetLimitRanges } from "./hooks/data-access/useGetLimitRanges";
import { useDeleteLimitRange } from "./hooks/data-mutation/useDeleteLimitRange";
import { useDeleteLimitRanges } from "./hooks/data-mutation/useDeleteLimitRanges";

interface LimitRangeTableCtaButtonsProps {
  name: string;
  namespace: string;
}

const LimitRangeTableCtaButtons: FC<LimitRangeTableCtaButtonsProps> = ({ name, namespace }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteLr, isPending: isDeletePending } = useDeleteLimitRange();

  const handleDeleteConfirm = () => {
    deleteLr({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
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
            onClick={() => openTab("modification", { kind: "LimitRange", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <LimitRangeDeleteConfirmationModal
        open={showDeleteModal}
        mode="single"
        lrName={name}
        lrNamespace={namespace}
        isPending={isDeletePending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

export const LimitRangesView: FC = () => {
  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleLimitRangeDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleLimitRangeDetail: v.onToggleLimitRangeDetail,
  }));

  const openBrowserURL = useOpenBrowserURL();

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLimitRangeIds, setSelectedLimitRangeIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { mutate: deleteLimitRanges, isPending: isBulkDeletePending } = useDeleteLimitRanges();

  const { data: raw = [], isLoading } = useGetLimitRanges({ context: activeContext, namespaces });

  const limitranges = raw
    .filter((lr) => !search || lr.Name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  const {
    visibleItems: visibleLimitRanges,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(limitranges, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Limit Ranges</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          description="A LimitRange constrains the resource requests and limits that containers or Pods can request within a namespace."
          docsUrl="https://kubernetes.io/docs/concepts/policy/limit-range"
        />
        <span className="text-xs text-muted-foreground">
          {limitranges.length} item{limitranges.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedLimitRangeIds.size}
            ariaLabel="Delete selected limit ranges"
            tooltip="Delete selected Limit Ranges"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <ResourceCreationButton
            ariaLabel="Create LimitRange"
            tooltip="Create Limit Range"
            onClick={() => setIsCreateOpen(true)}
          />
          <SearchInput
            placeholder="Search Limit Ranges..."
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
                  visibleLimitRanges.length > 0 &&
                  visibleLimitRanges.every((lr) =>
                    selectedLimitRangeIds.has(`${lr.Namespace}/${lr.Name}`)
                  )
                }
                indeterminate={
                  visibleLimitRanges.some((lr) =>
                    selectedLimitRangeIds.has(`${lr.Namespace}/${lr.Name}`)
                  ) &&
                  !visibleLimitRanges.every((lr) =>
                    selectedLimitRangeIds.has(`${lr.Namespace}/${lr.Name}`)
                  )
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedLimitRangeIds);
                    visibleLimitRanges.forEach((lr) =>
                      newSelection.add(`${lr.Namespace}/${lr.Name}`)
                    );
                    setSelectedLimitRangeIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedLimitRangeIds);
                    visibleLimitRanges.forEach((lr) =>
                      newSelection.delete(`${lr.Namespace}/${lr.Name}`)
                    );
                    setSelectedLimitRangeIds(newSelection);
                  }
                }}
                aria-label="Select all visible limit ranges"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 3 : 2}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[55%]", "w-[30%]"]}
            />
          ) : visibleLimitRanges.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 5 : 4} className="px-0 py-0">
                <EmptyState
                  icon={<SlidersHorizontalIcon className="size-8" />}
                  title="No Limit Ranges"
                  description="Create a Limit Range to constrain resource usage"
                  action={
                    <Button variant="default" size="default" onClick={() => setIsCreateOpen(true)}>
                      Create Limit Range
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleLimitRanges.map((lr) => {
              const lrId = `${lr.Namespace}/${lr.Name}`;
              const isSelected = selectedLimitRangeIds.has(lrId);
              return (
                <TableRow
                  key={lrId}
                  className={cn(isSelected && "bg-accent/30")}
                  onClick={() => onToggleLimitRangeDetail(lr.Namespace, lr.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedLimitRangeIds);
                        if (isSelected) newSelection.delete(lrId);
                        else newSelection.add(lrId);
                        setSelectedLimitRangeIds(newSelection);
                      }}
                      aria-label={`Select limit range ${lr.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{lr.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell className="text-xs">
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(lr.Namespace);
                        }}
                      >
                        {lr.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="text-xs">{lr.Age}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <LimitRangeTableCtaButtons name={lr.Name} namespace={lr.Namespace} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {isPaginated && (
        <TablePagination
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          totalItems={limitranges.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedLimitRangeIds.size > 0 && (
        <LimitRangeDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedLimitRangeIds).map((id) => {
            const [ns, name] = id.split("/");
            return { lrNamespace: ns, lrName: name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedLimitRangeIds).map((id) => {
              const [ns, name] = id.split("/");
              return { lrNamespace: ns, lrName: name };
            });
            deleteLimitRanges(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedLimitRangeIds(new Set());
                },
              }
            );
          }}
        />
      )}

      <LimitRangeCreationModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        activeNamespace={namespaces.length === 1 ? namespaces[0] : ""}
        activeContext={activeContext}
      />
    </div>
  );
};
