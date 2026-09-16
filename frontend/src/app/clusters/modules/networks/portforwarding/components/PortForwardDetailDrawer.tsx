import {
  Button,
  ButtonGroup,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlayIcon,
  ResourceDetailDrawer,
  ResourceDetailDrawerHeader,
  ResourceLink,
  ScrollArea,
  SheetTitle,
  SquareIcon,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Trash2Icon,
  useCopyToClipboard,
} from "@galacius/design-system";
import { FC, useState } from "react";
import { useOpenBrowserURL } from "../../../../../shared/hooks/useOpenBrowserURL";
import { useDetailDrawerContext } from "../../../../shared/components/details/DetailDrawerContext";
import { useResourceLinks } from "../../../../shared/hooks/useResourceLinks";
import type { PortForward } from "../api/resources";
import { RemovePortForward, StartPortForward, StopPortForward } from "../api/resources";
import { PortForwardOperationDialog } from "./PortForwardOperationDialog";
import { PortForwardStatusBadge } from "./PortForwardStatusBadge";

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

interface PortForwardDrawerCtaButtonsProps {
  pf: PortForward;
  onClose: () => void;
  onEdit: () => void;
}

const PortForwardDrawerCtaButtons: FC<PortForwardDrawerCtaButtonsProps> = ({
  pf,
  onClose,
  onEdit,
}) => {
  const openBrowserURL = useOpenBrowserURL();
  return (
    <ButtonGroup>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Open in browser"
                variant="ghost"
                size="icon-sm"
                disabled={pf.Status !== "Active"}
                onClick={() => openBrowserURL(`${pf.Scheme}://${pf.Address}:${pf.LocalPort}`)}
              >
                <ExternalLinkIcon />
              </Button>
            }
          />
          <TooltipContent side="bottom">Open in browser</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button aria-label="Edit" variant="ghost" size="icon-sm" onClick={onEdit}>
                <PencilIcon />
              </Button>
            }
          />
          <TooltipContent side="bottom">Edit</TooltipContent>
        </Tooltip>
        {pf.Status === "Stopped" ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Activate"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleActivate(pf).catch(console.error)}
                >
                  <PlayIcon />
                </Button>
              }
            />
            <TooltipContent side="bottom">Activate</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Stop"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pf.Status === "Stopped"}
                  onClick={() => StopPortForward(pf.ID).catch(console.error)}
                >
                  <SquareIcon />
                </Button>
              }
            />
            <TooltipContent side="bottom">Stop</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Delete"
                variant="ghost"
                size="icon-sm"
                className="hover:text-destructive"
                onClick={() => RemovePortForward(pf.ID).finally(() => onClose())}
              >
                <Trash2Icon />
              </Button>
            }
          />
          <TooltipContent side="bottom">Delete</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </ButtonGroup>
  );
};

interface PortForwardDetailDrawerProps {
  open: boolean;
  portForward: PortForward | null;
  onClose: () => void;
}

const PortForwardDrawerBody: FC<PortForwardDetailDrawerProps & { portForward: PortForward }> = ({
  portForward: pf,
  onClose,
}) => {
  const { onToggleNamespaceDetail } = useDetailDrawerContext((v) => ({
    onToggleNamespaceDetail: v.onToggleNamespaceDetail,
  }));
  const resourceLinks = useResourceLinks();

  const [editOpen, setEditOpen] = useState(false);

  const { copiedValue: copied, copy: handleCopy } = useCopyToClipboard(2000);

  return (
    <>
      <ResourceDetailDrawerHeader>
        <div className="group flex items-center gap-1.5">
          <SheetTitle className="text-h1 font-mono">
            Port Forward: {`${pf.Scheme}://${pf.Address}:${pf.LocalPort}`}
          </SheetTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="CopyIcon address"
            className="invisible group-hover:visible"
            onClick={() => handleCopy(`${pf.Scheme}://${pf.Address}:${pf.LocalPort}`)}
          >
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          </Button>
        </div>
        <PortForwardDrawerCtaButtons pf={pf} onClose={onClose} onEdit={() => setEditOpen(true)} />
      </ResourceDetailDrawerHeader>

      <ScrollArea className="flex-1">
        <div className="flex flex-col divide-y">
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center px-4 py-3">
            <span className="text-h3 text-muted-foreground">Resource Name</span>
            <span className="text-body">
              <ResourceLink
                onClick={
                  resourceLinks[pf.Kind?.toLowerCase() ?? ""]
                    ? () => resourceLinks[pf.Kind.toLowerCase()](pf.Namespace, pf.Name)
                    : undefined
                }
              >
                {pf.Name}
              </ResourceLink>
            </span>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center px-4 py-3">
            <span className="text-h3 text-muted-foreground">Namespace</span>
            <span className="text-body">
              <ResourceLink onClick={() => pf.Namespace && onToggleNamespaceDetail(pf.Namespace)}>
                {pf.Namespace || "—"}
              </ResourceLink>
            </span>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center px-4 py-3">
            <span className="text-h3 text-muted-foreground">Kind</span>
            <span className="text-body">{pf.Kind || "—"}</span>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center px-4 py-3">
            <span className="text-h3 text-muted-foreground">Pod Port</span>
            <span className="text-body font-mono">{pf.PodPort || "—"}</span>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center px-4 py-3">
            <span className="text-h3 text-muted-foreground">Service Port</span>
            <span className="text-body font-mono">{pf.ServicePort || "—"}</span>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center px-4 py-3">
            <span className="text-h3 text-muted-foreground">Local Port</span>
            <span className="text-body font-mono">{pf.LocalPort || "—"}</span>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center px-4 py-3">
            <span className="text-h3 text-muted-foreground">Protocol</span>
            <span className="text-body">{pf.Protocol || "—"}</span>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center px-4 py-3">
            <span className="text-h3 text-muted-foreground">Address</span>
            <span className="text-body font-mono">
              {pf.Address ? `${pf.Scheme}://${pf.Address}` : "—"}
            </span>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center px-4 py-3">
            <span className="text-h3 text-muted-foreground">Status</span>
            <PortForwardStatusBadge status={pf.Status || "—"} />
          </div>
        </div>
      </ScrollArea>

      {pf && (
        <PortForwardOperationDialog
          key={pf.ID}
          open={editOpen}
          resourceName={pf.Name}
          namespace={pf.Namespace}
          kind={pf.Kind}
          podPort={pf.TargetPort}
          servicePort={pf.ServicePort}
          protocol={pf.Protocol}
          editingPf={pf}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
};

export const PortForwardDetailDrawer: FC<PortForwardDetailDrawerProps> = ({
  open,
  portForward: pf,
  onClose,
}) => {
  return (
    <ResourceDetailDrawer open={open} onClose={onClose}>
      {pf && <PortForwardDrawerBody key={pf.ID} open={open} portForward={pf} onClose={onClose} />}
    </ResourceDetailDrawer>
  );
};
