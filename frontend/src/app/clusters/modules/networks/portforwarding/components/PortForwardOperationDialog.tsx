import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@galacius/design-system";
import { FC, useReducer, useRef } from "react";
import { useOpenBrowserURL } from "../../../../../shared/hooks/useOpenBrowserURL";
import type { PortForward } from "../api/resources";
import { RemovePortForward, StartPortForward } from "../api/resources";
import { toastPortForwardStarted, toastPortForwardUpdated } from "./PortForwardConfirmationToast";

interface PfDialogState {
  address: string;
  localPort: string;
  useHttps: boolean;
  openInBrowser: boolean;
  pfLoading: boolean;
  pfError: string | null;
}

type PfDialogAction =
  | { type: "setAddress"; value: string }
  | { type: "setLocalPort"; value: string }
  | { type: "setUseHttps"; value: boolean }
  | { type: "setOpenInBrowser"; value: boolean }
  | { type: "startLoading" }
  | { type: "success" }
  | { type: "error"; message: string };

function pfDialogReducer(state: PfDialogState, action: PfDialogAction): PfDialogState {
  switch (action.type) {
    case "setAddress":
      return { ...state, address: action.value };
    case "setLocalPort":
      return { ...state, localPort: action.value };
    case "setUseHttps":
      return { ...state, useHttps: action.value };
    case "setOpenInBrowser":
      return { ...state, openInBrowser: action.value };
    case "startLoading":
      return { ...state, pfLoading: true, pfError: null };
    case "success":
      return { ...state, pfLoading: false };
    case "error":
      return { ...state, pfLoading: false, pfError: action.message };
  }
}

export interface PortForwardOperationDialogProps {
  open: boolean;
  resourceName: string;
  namespace: string;
  kind: string;
  podPort: string;
  servicePort?: string;
  protocol: string;
  onClose: () => void;
  onNavigateToPortForwarding?: () => void;
  editingPf?: PortForward;
}

export const PortForwardOperationDialog: FC<PortForwardOperationDialogProps> = ({
  open,
  resourceName,
  namespace,
  kind,
  podPort,
  servicePort = "",
  protocol,
  onClose,
  onNavigateToPortForwarding,
  editingPf,
}) => {
  const openBrowserURL = useOpenBrowserURL();
  const [state, dispatch] = useReducer(pfDialogReducer, {
    address: editingPf?.Address ?? "127.0.0.1",
    localPort: editingPf?.LocalPort ?? "",
    useHttps: editingPf?.Scheme === "https",
    openInBrowser: true,
    pfLoading: false,
    pfError: null,
  });
  const { address, localPort, useHttps, openInBrowser, pfLoading, pfError } = state;

  // Track if dialog is still open to prevent stale state updates after user clicks Cancel
  const dialogOpenRef = useRef(true);

  async function handleStart() {
    dispatch({ type: "startLoading" });
    try {
      if (editingPf) {
        await RemovePortForward(editingPf.ID);
      }
      const lp = localPort.trim() || "0";
      const scheme = useHttps ? "https" : "http";
      const result = await StartPortForward(
        namespace,
        kind,
        resourceName,
        podPort,
        lp,
        protocol,
        scheme,
        servicePort
      );

      // Skip side effects if dialog was closed while request was in flight
      if (!dialogOpenRef.current) return;

      dispatch({ type: "success" });
      onClose();
      if (editingPf) {
        toastPortForwardUpdated(resourceName);
      } else {
        toastPortForwardStarted(onNavigateToPortForwarding ?? (() => {}));
      }
      if (openInBrowser) {
        // Give the local TCP socket ~300ms to reach LISTEN state before the browser connects.
        // The Go side signals readyCh after the tunnel is open, but the kernel accept loop
        // has a small startup lag. Adjust if ERR_CONNECTION_REFUSED reappears on slow machines.
        const BROWSER_OPEN_DELAY_MS = 300;
        await new Promise((r) => setTimeout(r, BROWSER_OPEN_DELAY_MS));
        openBrowserURL(`http${useHttps ? "s" : ""}://${address}:${result.LocalPort}`);
      }
    } catch (err) {
      // Skip error dispatch if dialog was closed while request was in flight
      if (!dialogOpenRef.current) return;

      dispatch({ type: "error", message: String(err) });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        dialogOpenRef.current = o;
        if (!o) onClose();
      }}
    >
      <DialogContent showCloseButton={false} aria-busy={pfLoading}>
        <DialogHeader>
          <DialogTitle>
            {editingPf ? "Edit Port Forward" : "Port Forwarding"} for {resourceName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 text-sm">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pf-address" className="text-xs font-medium">
              Address
            </label>
            <Input
              id="pf-address"
              className="text-xs"
              value={address}
              onChange={(e) => dispatch({ type: "setAddress", value: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pf-localport" className="text-xs font-medium">
              Local Port
            </label>
            <Input
              id="pf-localport"
              className="text-xs"
              placeholder="Random"
              value={localPort}
              onChange={(e) => dispatch({ type: "setLocalPort", value: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox
                id="pf-https"
                checked={useHttps}
                onCheckedChange={(checked) => dispatch({ type: "setUseHttps", value: !!checked })}
              />
              <label htmlFor="pf-https" className="cursor-pointer text-xs">
                https
              </label>
            </div>
            <div className="flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox
                id="pf-open-browser"
                checked={openInBrowser}
                onCheckedChange={(checked) =>
                  dispatch({ type: "setOpenInBrowser", value: !!checked })
                }
              />
              <label htmlFor="pf-open-browser" className="cursor-pointer text-xs">
                Open in Browser
              </label>
            </div>
          </div>

          {pfError && <p className="text-xs text-destructive">{pfError}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dialogOpenRef.current = false;
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleStart} disabled={pfLoading}>
            {pfLoading ? (editingPf ? "Saving…" : "Starting…") : editingPf ? "Save" : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
