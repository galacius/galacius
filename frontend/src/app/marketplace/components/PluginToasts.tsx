import { renderErrorToast, renderSuccessToast } from "@galacius/design-system";

export function toastPluginInstallSucceeded(pluginName: string) {
  renderSuccessToast({
    title: "Plugin Installed",
    description: `${pluginName} was downloaded and installed successfully.`,
  });
}

export function toastPluginInstallFailed(pluginName: string, err?: unknown) {
  renderErrorToast({
    title: "Plugin Install Failed",
    description: err
      ? `Failed to install ${pluginName}: ${String(err)}`
      : `Failed to install ${pluginName}.`,
  });
}

export function toastPluginRemovalSucceeded(pluginName: string) {
  renderSuccessToast({
    title: "Plugin Removed",
    description: `${pluginName} was successfully removed from your system.`,
  });
}

export function toastPluginRemovalFailed(pluginName: string, err?: unknown) {
  renderErrorToast({
    title: "Plugin Removal Failed",
    description: err
      ? `Failed to remove ${pluginName}: ${String(err)}`
      : `Failed to remove ${pluginName}.`,
  });
}

export function toastPluginDisableFailed(pluginName: string, err?: unknown) {
  renderErrorToast({
    title: "Plugin Disable Failed",
    description: err
      ? `Failed to disable ${pluginName}: ${String(err)}`
      : `Failed to disable ${pluginName}.`,
  });
}

export function toastPluginEnableFailed(pluginName: string, err?: unknown) {
  renderErrorToast({
    title: "Plugin Enable Failed",
    description: err
      ? `Failed to enable ${pluginName}: ${String(err)}`
      : `Failed to enable ${pluginName}.`,
  });
}
