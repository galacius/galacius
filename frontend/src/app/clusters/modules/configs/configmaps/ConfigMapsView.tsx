import {
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  FileTextIcon,
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
  TruncatedText,
  cn,
} from "@galacius/design-system";
import { FC, useState } from "react";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { ConfigMapDeleteConfirmationModal } from "./components/ConfigMapDeleteConfirmationModal";
import { useGetConfigMaps } from "./hooks/data-access/useGetConfigMaps";
import { useDeleteConfigMap } from "./hooks/data-mutation/useDeleteConfigMap";
import { useDeleteConfigMaps } from "./hooks/data-mutation/useDeleteConfigMaps";

interface ConfigMapTableCtaButtonsProps {
  name: string;
  namespace: string;
}

const ConfigMapTableCtaButtons: FC<ConfigMapTableCtaButtonsProps> = ({ namespace, name }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteConfigMap, isPending: isDeletePending } = useDeleteConfigMap();

  const handleDeleteConfirm = () => {
    deleteConfigMap({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
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
            onClick={() => openTab("modification", { kind: "ConfigMap", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfigMapDeleteConfirmationModal
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

export const ConfigMapsView: FC = () => {
  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleConfigMapDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleConfigMapDetail: v.onToggleConfigMapDetail,
  }));

  const openBrowserURL = useOpenBrowserURL();

  const [search, setSearch] = useState("");
  const [selectedConfigMapIds, setSelectedConfigMapIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { mutate: deleteConfigMaps, isPending: isBulkDeletePending } = useDeleteConfigMaps();

  const { data: raw = [], isLoading } = useGetConfigMaps({ context: activeContext, namespaces });

  const configmaps = raw
    .filter((cm) => !search || cm.Name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  const {
    visibleItems: visibleConfigMaps,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(configmaps, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Config Maps</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          description="A ConfigMap stores non-confidential configuration data as key-value pairs, which Pods can consume as environment variables, command-line arguments, or files."
          docsUrl="https://kubernetes.io/docs/concepts/configuration/configmap"
        />
        <span className="text-xs text-muted-foreground">
          {configmaps.length} item{configmaps.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedConfigMapIds.size}
            ariaLabel="Delete selected config maps"
            tooltip="Delete selected ConfigMaps"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Config Maps..."
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
                  visibleConfigMaps.length > 0 &&
                  visibleConfigMaps.every((cm) =>
                    selectedConfigMapIds.has(`${cm.Namespace}/${cm.Name}`)
                  )
                }
                indeterminate={
                  visibleConfigMaps.some((cm) =>
                    selectedConfigMapIds.has(`${cm.Namespace}/${cm.Name}`)
                  ) &&
                  !visibleConfigMaps.every((cm) =>
                    selectedConfigMapIds.has(`${cm.Namespace}/${cm.Name}`)
                  )
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedConfigMapIds);
                    visibleConfigMaps.forEach((cm) =>
                      newSelection.add(`${cm.Namespace}/${cm.Name}`)
                    );
                    setSelectedConfigMapIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedConfigMapIds);
                    visibleConfigMaps.forEach((cm) =>
                      newSelection.delete(`${cm.Namespace}/${cm.Name}`)
                    );
                    setSelectedConfigMapIds(newSelection);
                  }
                }}
                aria-label="Select all visible config maps"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Keys</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length === 1 ? 3 : 4}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[55%]", "w-[35%]", "w-[30%]"]}
            />
          ) : visibleConfigMaps.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length === 1 ? 5 : 6} className="px-0 py-0">
                <EmptyState
                  icon={<FileTextIcon className="size-8" />}
                  title="No ConfigMaps"
                  description="Create a ConfigMap to store configuration"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleConfigMaps.map((cm) => {
              const cmId = `${cm.Namespace}/${cm.Name}`;
              const isSelected = selectedConfigMapIds.has(cmId);
              return (
                <TableRow
                  key={cmId}
                  className={cn(isSelected && "bg-accent/30", "cursor-pointer")}
                  onClick={() => onToggleConfigMapDetail(cm.Namespace, cm.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedConfigMapIds);
                        if (isSelected) newSelection.delete(cmId);
                        else newSelection.add(cmId);
                        setSelectedConfigMapIds(newSelection);
                      }}
                      aria-label={`Select config map ${cm.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{cm.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell className="text-xs">
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(cm.Namespace);
                        }}
                      >
                        {cm.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="max-w-xs text-muted-foreground">
                    <TruncatedText text={cm.Keys?.join(", ") || "—"} />
                  </TableCell>
                  <TableCell className="text-xs">{cm.Age}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <ConfigMapTableCtaButtons name={cm.Name} namespace={cm.Namespace} />
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
          totalItems={configmaps.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedConfigMapIds.size > 0 && (
        <ConfigMapDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedConfigMapIds).map((id) => {
            const [ns, name] = id.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedConfigMapIds).map((id) => {
              const [ns, name] = id.split("/");
              return { namespace: ns, name };
            });
            deleteConfigMaps(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedConfigMapIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
