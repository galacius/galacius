import {
  AnnotationBadge,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EmptyState,
  MoreVerticalIcon,
  NetworkIcon,
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
  cn,
} from "@galacius/design-system";
import { FC, useState } from "react";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import { useUnifiedTray } from "../../../shared/components/trays/unified/UnifiedTrayContext";
import { usePagination } from "../../../shared/hooks/usePagination";
import { ServiceDeleteConfirmationModal } from "./components/ServiceDeleteConfirmationModal";
import { ServiceStatusBadge } from "./components/ServiceStatusBadge";
import { useGetServices } from "./hooks/data-access/useGetServices";
import { useDeleteService } from "./hooks/data-mutation/useDeleteService";
import { useDeleteServices } from "./hooks/data-mutation/useDeleteServices";

interface ServiceTableCtaButtonsProps {
  namespace: string;
  name: string;
}

const ServiceTableCtaButtons: FC<ServiceTableCtaButtonsProps> = ({ namespace, name }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { openTab } = useUnifiedTray();

  const { mutate: deleteService, isPending: isDeletePending } = useDeleteService();

  const handleDeleteConfirm = () => {
    deleteService({ namespace, name }, { onSuccess: () => setShowDeleteModal(false) });
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
            onClick={() => openTab("modification", { kind: "Service", name, namespace })}
          />
          <ResourceDeletionButton
            disabled={isDeletePending}
            onClick={() => setShowDeleteModal(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <ServiceDeleteConfirmationModal
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

export const ServicesView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const [search, setSearch] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { activeContext, namespaces } = useMainLayoutContext();
  const { onToggleNamespaceDetail, onToggleServiceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
    onToggleServiceDetail: v.onToggleServiceDetail,
  }));

  const { mutate: deleteServices, isPending: isBulkDeletePending } = useDeleteServices();

  const { data: raw = [], isLoading } = useGetServices({ context: activeContext, namespaces });

  const services = raw
    .filter((svc) => !search || svc.Name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  const {
    visibleItems: visibleServices,
    page,
    pageCount,
    pageSize,
    pageSizeOptions,
    isPaginated,
    setPage,
    setPageSize,
  } = usePagination(services, { resetKey: search });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Services</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-lg" }}
          description="A Service exposes a set of Pods as a network endpoint, enabling stable access to them via a fixed IP or DNS name."
          docsUrl="https://kubernetes.io/docs/concepts/services-networking/service"
        />
        <span className="text-xs text-muted-foreground">
          {services.length} item{services.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <ResourceBulkDeletionButton
            count={selectedServiceIds.size}
            ariaLabel="Delete selected services"
            tooltip="Delete selected Services"
            onClick={() => setShowBulkDeleteModal(true)}
          />
          <SearchInput
            placeholder="Search Services..."
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
                  visibleServices.length > 0 &&
                  visibleServices.every((svc) =>
                    selectedServiceIds.has(`${svc.Namespace}/${svc.Name}`)
                  )
                }
                indeterminate={
                  visibleServices.some((svc) =>
                    selectedServiceIds.has(`${svc.Namespace}/${svc.Name}`)
                  ) &&
                  !visibleServices.every((svc) =>
                    selectedServiceIds.has(`${svc.Namespace}/${svc.Name}`)
                  )
                }
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelection = new Set(selectedServiceIds);
                    visibleServices.forEach((svc) =>
                      newSelection.add(`${svc.Namespace}/${svc.Name}`)
                    );
                    setSelectedServiceIds(newSelection);
                  } else {
                    const newSelection = new Set(selectedServiceIds);
                    visibleServices.forEach((svc) =>
                      newSelection.delete(`${svc.Namespace}/${svc.Name}`)
                    );
                    setSelectedServiceIds(newSelection);
                  }
                }}
                aria-label="Select all visible services"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            {namespaces.length !== 1 && <TableHead>Namespace</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Cluster IP</TableHead>
            <TableHead className="w-35">Ports</TableHead>
            <TableHead>External IP</TableHead>
            <TableHead>Selector</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={namespaces.length !== 1 ? 9 : 8}
              includeCheckbox={true}
              columnWidths={[
                "w-[65%]",
                "w-[55%]",
                "w-[35%]",
                "w-[40%]",
                "w-[35%]",
                "w-[35%]",
                "w-[40%]",
                "w-[30%]",
                "w-[40%]",
              ]}
            />
          ) : (
            visibleServices.map((svc) => {
              const svcId = `${svc.Namespace}/${svc.Name}`;
              const isSelected = selectedServiceIds.has(svcId);
              return (
                <TableRow
                  key={svcId}
                  className={cn(isSelected && "bg-accent/30", "cursor-pointer")}
                  onClick={() => onToggleServiceDetail(svc.Namespace, svc.Name)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        const newSelection = new Set(selectedServiceIds);
                        if (isSelected) newSelection.delete(svcId);
                        else newSelection.add(svcId);
                        setSelectedServiceIds(newSelection);
                      }}
                      aria-label={`Select service ${svc.Name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{svc.Name}</TableCell>
                  {namespaces.length !== 1 && (
                    <TableCell>
                      <ResourceLink
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNamespaceDetail(svc.Namespace);
                        }}
                      >
                        {svc.Namespace}
                      </ResourceLink>
                    </TableCell>
                  )}
                  <TableCell className="text-xs">{svc.Type}</TableCell>
                  <TableCell className="font-mono text-xs">{svc.ClusterIP}</TableCell>
                  <TableCell className="max-w-35 font-mono text-xs wrap-break-word whitespace-normal">
                    {svc.Ports}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{svc.ExternalIP}</TableCell>
                  <TableCell>
                    {Object.keys(svc.Selector ?? {}).length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(svc.Selector).map(([k, v]) => (
                          <AnnotationBadge key={k} label={v ? `${k}=${v}` : k} />
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{svc.Age}</TableCell>
                  <TableCell>
                    <ServiceStatusBadge status={svc.Status} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <ServiceTableCtaButtons namespace={svc.Namespace} name={svc.Name} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
          {services.length === 0 && !isLoading && (
            <TableRow>
              <TableCell colSpan={namespaces.length !== 1 ? 11 : 10} className="px-0 py-0">
                <EmptyState
                  icon={<NetworkIcon className="size-8" />}
                  title="No Services"
                  description="Create a service to get started"
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {isPaginated && (
        <TablePagination
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          totalItems={services.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selectedServiceIds.size > 0 && (
        <ServiceDeleteConfirmationModal
          open={showBulkDeleteModal}
          mode="bulk"
          items={Array.from(selectedServiceIds).map((id) => {
            const [ns, name] = id.split("/");
            return { namespace: ns, name };
          })}
          isPending={isBulkDeletePending}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={() => {
            const items = Array.from(selectedServiceIds).map((id) => {
              const [ns, name] = id.split("/");
              return { namespace: ns, name };
            });
            deleteServices(
              { items },
              {
                onSuccess: () => {
                  setShowBulkDeleteModal(false);
                  setSelectedServiceIds(new Set());
                },
              }
            );
          }}
        />
      )}
    </div>
  );
};
