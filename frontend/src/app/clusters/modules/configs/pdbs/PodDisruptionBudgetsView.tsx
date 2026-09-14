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
  SearchInput,
  ShieldAlertIcon,
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
import { PodDisruptionBudgetDeleteConfirmationModal } from "./components/PodDisruptionBudgetDeleteConfirmationModal";
import { useGetPodDisruptionBudgets } from "./hooks/data-access/useGetPodDisruptionBudgets";
import { useDeletePodDisruptionBudget } from "./hooks/data-mutation/useDeletePodDisruptionBudget";
import { useDeletePodDisruptionBudgets } from "./hooks/data-mutation/useDeletePodDisruptionBudgets";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

interface PodDisruptionBudgetTableCtaButtonsProps {
  name: string;
  namespace: string;
}

const PodDisruptionBudgetTableCtaButtons: FC<PodDisruptionBudgetTableCtaButtonsProps> = ({
  namespace,
  name,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deletePodDisruptionBudget, isPending: isDeletePending } =
    useDeletePodDisruptionBudget();

  const handleDeleteConfirm = () => {
    deletePodDisruptionBudget({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
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
            onClick={() =>
              openTab("modification", { kind: "PodDisruptionBudget", name, namespace })
            }
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <PodDisruptionBudgetDeleteConfirmationModal
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

export const PodDisruptionBudgetsView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onTogglePodDisruptionBudgetDetail } = useDetailDrawerContext(
    (v) => ({
      onToggleNamespaceDetail: v.onToggleNamespaceDetail,
      onTogglePodDisruptionBudgetDetail: v.onTogglePodDisruptionBudgetDetail,
    })
  );

  const [search, setSearch] = useState("");
  const [selectedPDBIds, setSelectedPDBIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { mutate: deletePodDisruptionBudgets, isPending: isBulkDeletePending } =
    useDeletePodDisruptionBudgets();

  const { data: raw = [], isLoading } = useGetPodDisruptionBudgets({
    context: activeContext,
    namespaces,
  });

  const pdbs = raw
    .filter((p) => !search || p.Name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  const {
    visibleItems: visiblePDBs,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(pdbs, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Pod Disruption Budgets</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          description="A PodDisruptionBudget limits the number of Pods of a replicated application that can be down simultaneously during voluntary disruptions."
          docsUrl="https://kubernetes.io/docs/tasks/run-application/configure-pdb"
        />
        <span className="text-xs text-muted-foreground">
          {pdbs.length} item{pdbs.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedPDBIds.size}
            ariaLabel="Delete selected pod disruption budgets"
            tooltip="Delete selected PodDisruptionBudgets"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Pod Disruption Budgets..."
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
                  visiblePDBs.length > 0 &&
                  visiblePDBs.every((p) => selectedPDBIds.has(`${p.Namespace}/${p.Name}`))
                }
                indeterminate={
                  visiblePDBs.some((p) => selectedPDBIds.has(`${p.Namespace}/${p.Name}`)) &&
                  !visiblePDBs.every((p) => selectedPDBIds.has(`${p.Namespace}/${p.Name}`))
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedPDBIds);
                    visiblePDBs.forEach((p) => newSelection.add(`${p.Namespace}/${p.Name}`));
                    setSelectedPDBIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedPDBIds);
                    visiblePDBs.forEach((p) => newSelection.delete(`${p.Namespace}/${p.Name}`));
                    setSelectedPDBIds(newSelection);
                  }
                }}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Min Available</TableHead>
            <TableHead>Max Unavailable</TableHead>
            <TableHead>Current Healthy</TableHead>
            <TableHead>Desired Healthy</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 6 : 5}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[55%]", "w-[30%]", "w-[35%]", "w-[35%]", "w-[35%]"]}
            />
          ) : visiblePDBs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 9 : 8} className="px-0 py-0">
                <EmptyState
                  icon={<ShieldAlertIcon className="size-8" />}
                  title="No Pod Disruption Budgets"
                  description="Create a Pod Disruption Budget to limit voluntary disruptions"
                />
              </TableCell>
            </TableRow>
          ) : (
            visiblePDBs.map((p) => (
              <TableRow
                key={`${p.Namespace}/${p.Name}`}
                onClick={() => onTogglePodDisruptionBudgetDetail(p.Namespace, p.Name)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedPDBIds.has(`${p.Namespace}/${p.Name}`)}
                    onCheckedChange={(checked) => {
                      const newSelection = new Set(selectedPDBIds);
                      if (checked) {
                        newSelection.add(`${p.Namespace}/${p.Name}`);
                      } else {
                        newSelection.delete(`${p.Namespace}/${p.Name}`);
                      }
                      setSelectedPDBIds(newSelection);
                    }}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{p.Name}</TableCell>
                {namespaces.length !== 1 && (
                  <TableCell className="text-xs">
                    <ResourceLink
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleNamespaceDetail(p.Namespace);
                      }}
                    >
                      {p.Namespace}
                    </ResourceLink>
                  </TableCell>
                )}
                <TableCell className="text-xs">{p.MinAvailable}</TableCell>
                <TableCell className="text-xs">{p.MaxUnavailable}</TableCell>
                <TableCell className="text-xs">{p.CurrentHealthy}</TableCell>
                <TableCell className="text-xs">{p.DesiredHealthy}</TableCell>
                <TableCell className="text-xs">{p.Age}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <PodDisruptionBudgetTableCtaButtons name={p.Name} namespace={p.Namespace} />
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
          totalItems={pdbs.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedPDBIds.size > 0 && (
        <PodDisruptionBudgetDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedPDBIds).map((key) => {
            const [ns, name] = key.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedPDBIds).map((key) => {
              const [ns, name] = key.split("/");
              return { namespace: ns, name };
            });
            deletePodDisruptionBudgets(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedPDBIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
