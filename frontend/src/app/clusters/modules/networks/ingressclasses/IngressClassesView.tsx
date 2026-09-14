import {
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  MoreVerticalIcon,
  ResourceBulkDeletionButton,
  ResourceDeletionButton,
  ResourceExplanationTooltip,
  ResourceModificationButton,
  RouteIcon,
  SearchInput,
  StarIcon,
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
import { usePagination } from "../../../shared/hooks/usePagination";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { IngressClassDeleteConfirmationModal } from "./components/IngressClassDeleteConfirmationModal";
import { useGetIngressClasses } from "./hooks/data-access/useGetIngressClasses";
import { useDeleteIngressClass } from "./hooks/data-mutation/useDeleteIngressClass";
import { useDeleteIngressClasses } from "./hooks/data-mutation/useDeleteIngressClasses";
import { useSetIngressClassAsDefault } from "./hooks/data-mutation/useSetIngressClassAsDefault";
import { useUnsetIngressClassAsDefault } from "./hooks/data-mutation/useUnsetIngressClassAsDefault";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

interface IngressClassTableCtaButtonsProps {
  name: string;
  isDefault: boolean;
}

const IngressClassTableCtaButtons: FC<IngressClassTableCtaButtonsProps> = ({ name, isDefault }) => {
  const { mutate: setAsDefault, isPending: isSettingDefault } = useSetIngressClassAsDefault();
  const { mutate: unsetAsDefault, isPending: isUnsettingDefault } = useUnsetIngressClassAsDefault();
  const isPending = isSettingDefault || isUnsettingDefault;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();
  const { mutate: deleteSingle, isPending: isDeletePending } = useDeleteIngressClass();

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
        <DropdownMenuContent align="end" className="w-fit">
          <DropdownMenuItem
            disabled={isPending}
            onClick={(e) => {
              e.stopPropagation();
              if (isDefault) unsetAsDefault(name);
              else setAsDefault(name);
            }}
          >
            <StarIcon fill={isDefault ? "currentColor" : "none"} className="mr-2 size-3.5" />
            {isDefault ? "Unset default" : "Set as default"}
          </DropdownMenuItem>
          <ResourceModificationButton
            onClick={() => openTab("modification", { kind: "IngressClass", name })}
          />
          <ResourceDeletionButton onClick={() => setShowDeleteModal(true)} />
        </DropdownMenuContent>
      </DropdownMenu>

      <IngressClassDeleteConfirmationModal
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

export const IngressClassesView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { activeContext } = useMainLayoutContext();
  const { onToggleIngressClassDetail } = useDetailDrawerContext((v) => ({
    onToggleIngressClassDetail: v.onToggleIngressClassDetail,
  }));
  const { mutate: deleteBulk, isPending: isDeleteBulkPending } = useDeleteIngressClasses();

  const { data: raw = [], isLoading } = useGetIngressClasses(activeContext);

  const ingressClasses = raw
    .filter((ic) => !search || ic.Name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  const {
    visibleItems: visibleIngressClasses,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(ingressClasses, { resetKey: search });

  const handleToggleRow = (name: string) => {
    const newSelection = new Set(selection);
    if (newSelection.has(name)) {
      newSelection.delete(name);
    } else {
      newSelection.add(name);
    }
    setSelection(newSelection);
  };

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
        <span className="text-h1">Ingress Classes</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-xl" }}
          description="An IngressClass specifies which Ingress controller should implement a given Ingress, along with controller-specific configuration."
          docsUrl="https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-class"
        />
        <span className="text-xs text-muted-foreground">
          {ingressClasses.length} item{ingressClasses.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selection.size}
            ariaLabel="Delete selected ingress classes"
            tooltip="Delete selected IngressClasses"
            onClick={handleBulkDeleteClick}
          />
          <SearchInput
            placeholder="Search Ingress Classes..."
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
                  visibleIngressClasses.length > 0 &&
                  visibleIngressClasses.every((ic) => selection.has(ic.Name))
                }
                indeterminate={
                  visibleIngressClasses.some((ic) => selection.has(ic.Name)) &&
                  !visibleIngressClasses.every((ic) => selection.has(ic.Name))
                }
                onCheckedChange={() => {
                  if (
                    visibleIngressClasses.length > 0 &&
                    visibleIngressClasses.every((ic) => selection.has(ic.Name))
                  ) {
                    const newSelection = new Set(selection);
                    visibleIngressClasses.forEach((ic) => newSelection.delete(ic.Name));
                    setSelection(newSelection);
                  } else {
                    const newSelection = new Set(selection);
                    visibleIngressClasses.forEach((ic) => newSelection.add(ic.Name));
                    setSelection(newSelection);
                  }
                }}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Controller</TableHead>
            <TableHead>Scope</TableHead>
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
              columnWidths={["w-[65%]", "w-[45%]", "w-[30%]"]}
            />
          ) : visibleIngressClasses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-0 py-0">
                <EmptyState
                  icon={<RouteIcon className="size-8" />}
                  title="No Ingress Classes"
                  description="Ingress Classes define which controller implements an Ingress"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleIngressClasses.map((ic) => (
              <TableRow key={ic.Name} onClick={() => onToggleIngressClassDetail(ic.Name)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selection.has(ic.Name)}
                    onCheckedChange={() => {
                      handleToggleRow(ic.Name);
                    }}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center">
                    <span>{ic.Name}</span>
                    {ic.IsDefault && (
                      <StarIcon fill="currentColor" className="ml-1 size-3.5 text-amber-400" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate font-mono text-xs">
                  {ic.Controller}
                </TableCell>
                <TableCell className="text-xs">Cluster</TableCell>
                <TableCell className="text-xs">{ic.Age}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <IngressClassTableCtaButtons name={ic.Name} isDefault={ic.IsDefault} />
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
          totalItems={ingressClasses.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <IngressClassDeleteConfirmationModal
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
