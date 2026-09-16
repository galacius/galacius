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
  RouteIcon,
  SearchInput,
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
import type { IngressRule } from "./api/resources";
import { useGetIngresses } from "./hooks/data-access/useGetIngresses";
import { useDeleteIngress } from "./hooks/data-mutation/useDeleteIngress";
import { useDeleteIngresses } from "./hooks/data-mutation/useDeleteIngresses";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { IngressDeleteConfirmationModal } from "./components/IngressDeleteConfirmationModal";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";

const IngressRulesCell: FC<{ rules: IngressRule[] }> = ({ rules }) => {
  const items = (rules ?? []).flatMap((rule, ri) =>
    (rule.Paths ?? []).map((path, pi) => ({
      key: `${ri}-${pi}`,
      url: `http://${rule.Host}${path.Path}`,
      backend: path.Backend,
    }))
  );

  if (items.length === 0) {
    return <span className="font-mono text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-1.5 font-mono text-xs">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-info hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {item.url}
          </a>
          <span className="text-muted-foreground">→</span>
          <span>{item.backend}</span>
        </div>
      ))}
    </div>
  );
};

interface IngressTableCtaButtonsProps {
  name: string;
  namespace: string;
}

const IngressTableCtaButtons: FC<IngressTableCtaButtonsProps> = ({ name, namespace }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteIngress, isPending: isDeletePending } = useDeleteIngress();

  const handleDeleteConfirm = () => {
    deleteIngress({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
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
            onClick={() => openTab("modification", { kind: "Ingress", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <IngressDeleteConfirmationModal
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

export const IngressesView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const [search, setSearch] = useState("");
  const [selectedIngressIds, setSelectedIngressIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleIngressDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleIngressDetail: v.onToggleIngressDetail,
  }));

  const { mutate: deleteIngresses, isPending: isBulkDeletePending } = useDeleteIngresses();

  const { data: raw = [], isLoading } = useGetIngresses({ context: activeContext, namespaces });

  const ingresses = raw
    .filter((i) => !search || i.Name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  const {
    visibleItems: visibleIngresses,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(ingresses, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Ingresses</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-lg" }}
          description="An Ingress manages external HTTP/HTTPS access to Services in a cluster, providing routing rules, TLS termination, and load balancing."
          docsUrl="https://kubernetes.io/docs/concepts/services-networking/ingress"
        />
        <span className="text-xs text-muted-foreground">
          {ingresses.length} item{ingresses.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedIngressIds.size}
            ariaLabel="Delete selected ingresses"
            tooltip="Delete selected Ingresses"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Ingresses..."
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
                  visibleIngresses.length > 0 &&
                  visibleIngresses.every((i) => selectedIngressIds.has(`${i.Namespace}/${i.Name}`))
                }
                indeterminate={
                  visibleIngresses.some((i) =>
                    selectedIngressIds.has(`${i.Namespace}/${i.Name}`)
                  ) &&
                  !visibleIngresses.every((i) => selectedIngressIds.has(`${i.Namespace}/${i.Name}`))
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedIngressIds);
                    visibleIngresses.forEach((i) => newSelection.add(`${i.Namespace}/${i.Name}`));
                    setSelectedIngressIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedIngressIds);
                    visibleIngresses.forEach((i) =>
                      newSelection.delete(`${i.Namespace}/${i.Name}`)
                    );
                    setSelectedIngressIds(newSelection);
                  }
                }}
                aria-label="Select all visible ingresses"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead className="w-40">Load Balancers</TableHead>
            <TableHead>Rules</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 5 : 4}
              includeCheckbox={true}
              columnWidths={["w-[65%]", "w-[55%]", "w-[45%]", "w-[55%]", "w-[30%]"]}
            />
          ) : visibleIngresses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 7 : 6} className="px-0 py-0">
                <EmptyState
                  icon={<RouteIcon className="size-8" />}
                  title="No Ingresses"
                  description="Create an Ingress to expose services externally"
                />
              </TableCell>
            </TableRow>
          ) : (
            visibleIngresses.map((i) => {
              const ingId = `${i.Namespace}/${i.Name}`;
              const isSelected = selectedIngressIds.has(ingId);
              return (
                <TableRow
                  key={ingId}
                  className={cn(isSelected && "bg-accent/30", "cursor-pointer")}
                  onClick={() => onToggleIngressDetail(i.Namespace, i.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedIngressIds);
                        if (isSelected) newSelection.delete(ingId);
                        else newSelection.add(ingId);
                        setSelectedIngressIds(newSelection);
                      }}
                      aria-label={`Select ingress ${i.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{i.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell className="text-xs">
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(i.Namespace);
                        }}
                      >
                        {i.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="max-w-40 font-mono text-xs wrap-break-word whitespace-normal">
                    {i.LoadBalancers}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <IngressRulesCell rules={i.Rules} />
                  </TableCell>
                  <TableCell className="text-xs">{i.Age}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <IngressTableCtaButtons name={i.Name} namespace={i.Namespace} />
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
          totalItems={ingresses.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedIngressIds.size > 0 && (
        <IngressDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedIngressIds).map((id) => {
            const [ns, name] = id.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedIngressIds).map((id) => {
              const [ns, name] = id.split("/");
              return { namespace: ns, name };
            });
            deleteIngresses(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedIngressIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
