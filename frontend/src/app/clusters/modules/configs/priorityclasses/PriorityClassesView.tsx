import {
  ArrowUpCircleIcon,
  Badge,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  MoreVerticalIcon,
  ResourceBulkDeletionButton,
  ResourceDeletionButton,
  ResourceExplanationTooltip,
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
import { FC, useState } from "react";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { PriorityClassDeleteConfirmationModal } from "./components/PriorityClassDeleteConfirmationModal";
import { useGetPriorityClasses } from "./hooks/data-access/useGetPriorityClasses";
import { useDeletePriorityClass } from "./hooks/data-mutation/useDeletePriorityClass";
import { useDeletePriorityClasses } from "./hooks/data-mutation/useDeletePriorityClasses";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

interface PriorityClassTableCtaButtonsProps {
  name: string;
}

const PriorityClassTableCtaButtons: FC<PriorityClassTableCtaButtonsProps> = ({ name }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteSingle, isPending: isDeletePending } = useDeletePriorityClass();

  const handleConfirmDelete = () => {
    deleteSingle({ name }, { onSuccess: () => setShowDeleteModal(false) });
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
            onClick={() => openTab("modification", { kind: "PriorityClass", name })}
          />
          <ResourceDeletionButton onClick={() => setShowDeleteModal(true)} />
        </DropdownMenuContent>
      </DropdownMenu>

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

export const PriorityClassesView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const { activeContext } = useMainLayoutContext();
  const { onTogglePriorityClass } = useDetailDrawerContext((v) => ({
    onTogglePriorityClass: v.onTogglePriorityClass,
  }));

  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { mutate: deleteBulk, isPending: isDeleteBulkPending } = useDeletePriorityClasses();

  const { data: raw = [], isLoading } = useGetPriorityClasses(activeContext);

  const priorityClasses = search
    ? raw.filter((pc) => pc.Name.toLowerCase().includes(search.toLowerCase()))
    : raw;

  const {
    visibleItems: visiblePriorityClasses,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(priorityClasses, { resetKey: search });

  const handleBulkDeleteClick = () => {
    if (selection.size === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = () => {
    const items = Array.from(selection).map((name) => ({ name }));
    deleteBulk(
      { items },
      {
        onSuccess: () => {
          setShowBulkDeleteModal(false);
          setSelection(new Set());
        },
      }
    );
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Priority Classes</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-xl" }}
          description="A PriorityClass defines a mapping from a name to an integer priority value, used to influence Pod scheduling and preemption order."
          docsUrl="https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption"
        />
        <span className="text-xs text-muted-foreground">
          {priorityClasses.length} item{priorityClasses.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selection.size}
            ariaLabel="Delete selected priority classes"
            tooltip="Delete selected PriorityClasses"
            onClick={handleBulkDeleteClick}
          />
          <SearchInput
            placeholder="Search Priority Classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="w-68"
          />
        </div>
      </div>

      <Table containerClassName="flex-1 overflow-y-auto">
        <TableHeader className="z-sticky sticky top-0 bg-background">
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                checked={
                  visiblePriorityClasses.length > 0 &&
                  visiblePriorityClasses.every((pc) => selection.has(pc.Name))
                }
                indeterminate={
                  visiblePriorityClasses.some((pc) => selection.has(pc.Name)) &&
                  !visiblePriorityClasses.every((pc) => selection.has(pc.Name))
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selection);
                    visiblePriorityClasses.forEach((pc) => newSelection.add(pc.Name));
                    setSelection(newSelection);
                  } else {
                    const newSelection = new Set(selection);
                    visiblePriorityClasses.forEach((pc) => newSelection.delete(pc.Name));
                    setSelection(newSelection);
                  }
                }}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Global Default</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={3}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[30%]", "w-[30%]"]}
            />
          ) : visiblePriorityClasses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-0 py-0">
                <EmptyState
                  icon={<ArrowUpCircleIcon className="size-8" />}
                  title="No Priority Classes"
                  description="Create a Priority Class to control pod scheduling priority"
                />
              </TableCell>
            </TableRow>
          ) : (
            visiblePriorityClasses.map((pc) => (
              <TableRow key={pc.Name} onClick={() => onTogglePriorityClass(pc.Name)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selection.has(pc.Name)}
                    onCheckedChange={() => {
                      const newSelection = new Set(selection);
                      if (newSelection.has(pc.Name)) {
                        newSelection.delete(pc.Name);
                      } else {
                        newSelection.add(pc.Name);
                      }
                      setSelection(newSelection);
                    }}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{pc.Name}</TableCell>
                <TableCell className="font-mono text-xs">{pc.Value}</TableCell>
                <TableCell className="text-xs">
                  {pc.GlobalDefault ? (
                    <Badge className="bg-success text-white hover:bg-success">true</Badge>
                  ) : (
                    <Badge className="bg-zinc-700 text-white hover:bg-zinc-700">false</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">{pc.Age}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <PriorityClassTableCtaButtons name={pc.Name} />
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
          totalItems={priorityClasses.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <PriorityClassDeleteConfirmationModal
        open={showBulkDeleteModal}
        mode="bulk"
        items={Array.from(selection).map((name) => ({ name }))}
        isPending={isDeleteBulkPending}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
};
