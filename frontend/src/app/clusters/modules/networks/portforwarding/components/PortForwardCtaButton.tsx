import { Button } from "@galacius/design-system";
import { FC } from "react";
import type { PortForward } from "../api/resources";
import { RemovePortForward, StopPortForward } from "../api/resources";
import {
  toastPortForwardRemoved,
  toastPortForwardStopFailed,
  toastPortForwardStopped,
} from "./PortForwardConfirmationToast";

export interface PortForwardCtaButtonProps {
  activePf: PortForward | undefined;
  port: number;
  svcName: string;
  onForwardPort: () => void;
  onNavigateToPortForwarding: () => void;
}

export const PortForwardCtaButton: FC<PortForwardCtaButtonProps> = ({
  activePf,
  port,
  svcName,
  onForwardPort,
  onNavigateToPortForwarding,
}) => {
  if (!activePf) {
    return (
      <Button
        size="xs"
        variant="outline"
        className="border-success text-success hover:bg-success/10"
        onClick={onForwardPort}
      >
        Forward...
      </Button>
    );
  }

  if (activePf.Status === "Active") {
    return (
      <Button
        size="xs"
        variant="outline"
        className="border-warning text-warning hover:bg-warning/10"
        onClick={async () => {
          try {
            await StopPortForward(activePf.ID);
            toastPortForwardStopped(port, svcName, onNavigateToPortForwarding);
          } catch (err) {
            toastPortForwardStopFailed(err);
          }
        }}
      >
        Stop
      </Button>
    );
  }

  return (
    <Button
      size="xs"
      variant="outline"
      className="border-destructive text-destructive hover:bg-destructive/10"
      onClick={async () => {
        try {
          await RemovePortForward(activePf.ID);
          toastPortForwardRemoved(port, svcName, onNavigateToPortForwarding);
        } catch (err) {
          console.error(err);
        }
      }}
    >
      Remove
    </Button>
  );
};
