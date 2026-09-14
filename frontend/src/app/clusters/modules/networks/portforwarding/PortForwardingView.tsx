import {
  ArrowLeftRightIcon,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ExternalLinkIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlayIcon,
  ResourceExplanationTooltip,
  ResourceLink,
  SearchInput,
  SquareIcon,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeletonLoader,
  Trash2Icon,
} from "@galacius/design-system";
import { FC, useState } from "react";
import { useOpenBrowserURL } from "../../../../shared/hooks/useOpenBrowserURL";
import { useMainLayoutContext } from "../../../MainLayoutContext";
import { useDetailDrawerContext } from "../../../shared/components/details/DetailDrawerContext";
import type { PortForward } from "./api/resources";
import { RemovePortForward, StartPortForward, StopPortForward } from "./api/resources";
import { PortForwardDetailDrawer } from "./components/PortForwardDetailDrawer";
import { PortForwardOperationDialog } from "./components/PortForwardOperationDialog";
import { PortForwardStatusBadge } from "./components/PortForwardStatusBadge";
import { useGetPortForwards } from "./hooks/data-access/useGetPortForwards";

interface PortForwardingTableCtaButtonsProps {
  pf: PortForward;
  onEdit: (pf: PortForward) => void;
}

const PortForwardingTableCtaButtons: FC<PortForwardingTableCtaButtonsProps> = ({ pf, onEdit }) => {
  const openBrowserURL = useOpenBrowserURL();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Actions"
        className="flex size-6 cursor-pointer items-center justify-center rounded-sm hover:bg-accent"
      >
        <MoreVerticalIcon className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={pf.Status !== "Active"}
          onClick={() => openBrowserURL(`${pf.Scheme}://${pf.Address}:${pf.LocalPort}`)}
        >
          <ExternalLinkIcon className="mr-2 size-3.5" />
          Open
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(pf)}>
          <PencilIcon className="mr-2 size-3.5" />
          Edit
        </DropdownMenuItem>
        {pf.Status !== "Active" ? (
          <DropdownMenuItem onClick={() => handleActivate(pf).catch(console.error)}>
            <PlayIcon className="mr-2 size-3.5" />
            Active
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => StopPortForward(pf.ID).catch(console.error)}>
            <SquareIcon className="mr-2 size-3.5" />
            Stop
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => RemovePortForward(pf.ID).catch(console.error)}
        >
          <Trash2Icon className="mr-2 size-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

async function handleActivate(pf: PortForward) {
  await RemovePortForward(pf.ID);
  await StartPortForward(
    pf.Namespace,
    pf.Kind,
    pf.Name,
    pf.TargetPort,
    pf.LocalPort,
    pf.Protocol,
    pf.Scheme,
    pf.ServicePort
  );
}

export const PortForwardingView: FC = () => {
  const openBrowserURL = useOpenBrowserURL();
  const { activeContext } = useMainLayoutContext();
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingPf, setEditingPf] = useState<PortForward | null>(null);

  const { data: raw = [], isLoading } = useGetPortForwards({ context: activeContext });

  const sessions = raw
    .filter((s) => !search || s.Name.toLowerCase().includes(search.toLowerCase()))
    .toSorted((a, b) => a.Name.localeCompare(b.Name));

  const selectedPf = selectedId ? (raw.find((s) => s.ID === selectedId) ?? null) : null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-h1">Port Forwarding</span>
        <ResourceExplanationTooltip
          onOpenDocs={openBrowserURL}
          classNames={{ content: "max-w-2xl" }}
          description="Port forwarding creates a direct network tunnel to a Pod or Service, letting you reach it from your local machine without exposing it on the cluster."
          docsUrl="https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster"
        />
        <span className="text-xs text-muted-foreground">
          {sessions.length} item{sessions.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <SearchInput
            placeholder="SearchIcon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="w-68"
          />
        </div>
      </div>

      <Table containerClassName="flex-1 overflow-y-auto">
        <TableHeader className="z-sticky sticky top-0 bg-background">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Namespace</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Pod Port</TableHead>
            <TableHead>Service Port</TableHead>
            <TableHead>Local Port</TableHead>
            <TableHead>Protocol</TableHead>
            <TableHead>Scheme</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonLoader
              rows={5}
              columns={10}
              includeCheckbox={false}
              columnWidths={[
                "w-[65%]",
                "w-[55%]",
                "w-[35%]",
                "w-[30%]",
                "w-[35%]",
                "w-[30%]",
                "w-[30%]",
                "w-[30%]",
                "w-[40%]",
                "w-[35%]",
              ]}
            />
          ) : sessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="px-0 py-0">
                <EmptyState
                  icon={<ArrowLeftRightIcon className="size-8" />}
                  title="No Port Forwards"
                  description="Start a port forward from a pod or service to get started"
                />
              </TableCell>
            </TableRow>
          ) : (
            sessions.map((s) => (
              <TableRow key={s.ID} className="cursor-pointer" onClick={() => setSelectedId(s.ID)}>
                <TableCell className="font-mono text-xs">{s.Name}</TableCell>
                <TableCell className="text-xs">
                  <ResourceLink
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleNamespaceDetail(s.Namespace);
                    }}
                  >
                    {s.Namespace}
                  </ResourceLink>
                </TableCell>
                <TableCell className="text-xs">{s.Kind}</TableCell>
                <TableCell className="font-mono text-xs">{s.PodPort}</TableCell>
                <TableCell className="font-mono text-xs">{s.ServicePort || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{s.LocalPort}</TableCell>
                <TableCell className="text-xs">{s.Protocol}</TableCell>
                <TableCell className="text-xs">{s.Scheme || "—"}</TableCell>
                <TableCell className="text-xs">{s.Address || "—"}</TableCell>
                <TableCell>
                  <PortForwardStatusBadge status={s.Status} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <PortForwardingTableCtaButtons pf={s} onEdit={setEditingPf} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <PortForwardDetailDrawer
        open={!!selectedPf}
        portForward={selectedPf}
        onClose={() => setSelectedId(null)}
      />

      {editingPf && (
        <PortForwardOperationDialog
          key={editingPf.ID}
          open={!!editingPf}
          resourceName={editingPf.Name}
          namespace={editingPf.Namespace}
          kind={editingPf.Kind}
          podPort={editingPf.TargetPort}
          servicePort={editingPf.ServicePort}
          protocol={editingPf.Protocol}
          editingPf={editingPf}
          onClose={() => setEditingPf(null)}
        />
      )}
    </div>
  );
};
