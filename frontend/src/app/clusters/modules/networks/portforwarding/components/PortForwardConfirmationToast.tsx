import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export function toastPortForwardStarted(onNavigateToPortForwarding: () => void) {
  renderSuccessToast({
    title: "Port Forwarding",
    description: "You can manage your port forwards on the Port Forwarding Page.",
    action: {
      label: "Go to Port Forwarding",
      onClick: () => {
        onNavigateToPortForwarding();
      },
    },
  });
}

export function toastPortForwardStopped(
  port: number,
  resourceName: string,
  onNavigateToPortForwarding: () => void
) {
  renderSuccessToast({
    title: "Port Forward Stopped",
    description: `Stopped forwarding port ${port} for ${resourceName}.`,
    action: {
      label: "Go to Port Forwarding",
      onClick: () => {
        onNavigateToPortForwarding();
      },
    },
  });
}

export function toastPortForwardRemoved(
  port: number,
  resourceName: string,
  onNavigateToPortForwarding: () => void
) {
  renderSuccessToast({
    title: "Port Forward Removed",
    description: `Removed port forward for port ${port} on ${resourceName}.`,
    action: {
      label: "Go to Port Forwarding",
      onClick: () => {
        onNavigateToPortForwarding();
      },
    },
  });
}

export function toastPortForwardUpdated(resourceName: string) {
  renderSuccessToast({
    title: "Port Forward Updated",
    description: `Port forward for ${resourceName} has been restarted with the new settings.`,
  });
}

export function toastPortForwardStopFailed(err: unknown) {
  renderErrorToast({ title: "Failed to Stop Port Forward", description: String(err) });
}
