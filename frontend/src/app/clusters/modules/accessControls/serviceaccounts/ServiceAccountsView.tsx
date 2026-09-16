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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableSkeletonLoader,
  UserRoundIcon,
  cn,
} from "@galacius/design-system";
import { FC, useMemo, useReducer, useState } from "react";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { ServiceAccountDeleteConfirmationModal } from "./components/ServiceAccountDeleteConfirmationModal";
import { ServiceAccountDetailDrawer } from "./components/ServiceAccountDetailDrawer";
import { useGetServiceAccounts } from "./hooks/data-access/useGetServiceAccounts";
import { useDeleteServiceAccount } from "./hooks/data-mutation/useDeleteServiceAccount";
import { useDeleteServiceAccounts } from "./hooks/data-mutation/useDeleteServiceAccounts";

type DrawerState = { name: string | null; namespace: string | null; open: boolean };

type DrawerAction = { type: "open"; name: string; namespace: string } | { type: "close" };

function drawerReducer(state: DrawerState, action: DrawerAction): DrawerState {
  switch (action.type) {
    case "open":
      return { name: action.name, namespace: action.namespace, open: true };
    case "close":
      return { ...state, open: false };
  }
}

const ServiceAccountTableCtaButtons: FC<{ namespace: string; name: string }> = ({
  namespace,
  name,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteServiceAccount, isPending: isDeletePending } = useDeleteServiceAccount();

  const handleDeleteConfirm = () => {
    deleteServiceAccount({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
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
            onClick={() => openTab("modification", { kind: "ServiceAccount", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <ServiceAccountDeleteConfirmationModal
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

export const ServiceAccountsView: FC = () => {
  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  const openBrowserURL = useOpenBrowserURL();

  const [search, setSearch] = useState("");
  const [selectedSAIds, setSelectedSAIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const [drawerState, dispatchDrawer] = useReducer(drawerReducer, {
    name: null,
    namespace: null,
    open: false,
  });

  const { mutate: deleteServiceAccounts, isPending: isBulkDeletePending } =
    useDeleteServiceAccounts();

  const { data: raw = [], isLoading } = useGetServiceAccounts({
    context: activeContext,
    namespaces,
  });

  const serviceAccounts = useMemo(
    () =>
      raw
        .filter((sa) => !search || sa.Name.toLowerCase().includes(search.toLowerCase()))
        .toSorted((a, b) => a.Name.localeCompare(b.Name)),
    [raw, search]
  );

  const {
    visibleItems: visibleServiceAccounts,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(serviceAccounts, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Service Accounts</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          description="A ServiceAccount provides an identity for processes running in a Pod to authenticate with the Kubernetes API."
          docsUrl="https://kubernetes.io/docs/concepts/security/service-accounts"
        />
        <span className="text-xs text-muted-foreground">
          {serviceAccounts.length} item{serviceAccounts.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedSAIds.size}
            ariaLabel="Delete selected service accounts"
            tooltip="Delete selected ServiceAccounts"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Service Accounts..."
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
                  visibleServiceAccounts.length > 0 &&
                  visibleServiceAccounts.every((sa) =>
                    selectedSAIds.has(`${sa.Namespace}/${sa.Name}`)
                  )
                }
                indeterminate={
                  visibleServiceAccounts.some((sa) =>
                    selectedSAIds.has(`${sa.Namespace}/${sa.Name}`)
                  ) &&
                  !visibleServiceAccounts.every((sa) =>
                    selectedSAIds.has(`${sa.Namespace}/${sa.Name}`)
                  )
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedSAIds);
                    visibleServiceAccounts.forEach((sa) =>
                      newSelection.add(`${sa.Namespace}/${sa.Name}`)
                    );
                    setSelectedSAIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedSAIds);
                    visibleServiceAccounts.forEach((sa) =>
                      newSelection.delete(`${sa.Namespace}/${sa.Name}`)
                    );
                    setSelectedSAIds(newSelection);
                  }
                }}
                aria-label="Select all visible service accounts"
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
          ) : visibleServiceAccounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 5 : 4} className="px-0 py-0">
                <EmptyState
                  icon={<UserRoundIcon className="size-8" />}
                  title="No Service Accounts"
                  description="Create a Service Account for pod identity"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleServiceAccounts.map((sa) => {
              const saId = `${sa.Namespace}/${sa.Name}`;
              const isSelected = selectedSAIds.has(saId);
              return (
                <TableRow
                  key={saId}
                  className={cn(isSelected && "bg-accent/30", "cursor-pointer")}
                  onClick={() => {
                    dispatchDrawer({ type: "open", name: sa.Name, namespace: sa.Namespace });
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedSAIds);
                        if (isSelected) newSelection.delete(saId);
                        else newSelection.add(saId);
                        setSelectedSAIds(newSelection);
                      }}
                      aria-label={`Select service account ${sa.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{sa.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell className="text-xs">
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(sa.Namespace);
                        }}
                      >
                        {sa.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="text-xs">{sa.Age}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <ServiceAccountTableCtaButtons namespace={sa.Namespace} name={sa.Name} />
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
          totalItems={serviceAccounts.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedSAIds.size > 0 && (
        <ServiceAccountDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedSAIds).map((id) => {
            const [ns, name] = id.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedSAIds).map((id) => {
              const [ns, name] = id.split("/");
              return { namespace: ns, name };
            });
            deleteServiceAccounts(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedSAIds(new Set());
                },
              }
            );
          }}
        />
      )}

      <ServiceAccountDetailDrawer
        saName={drawerState.name}
        saNamespace={drawerState.namespace}
        open={drawerState.open}
        onClose={() => dispatchDrawer({ type: "close" })}
      />
    </div>
  );
};
