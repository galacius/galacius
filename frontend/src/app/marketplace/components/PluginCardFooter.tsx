import { Button } from "@galacius/design-system";
import { FC } from "react";
import { DownloadProgressIndicator } from "./DownloadProgressIndicator";

type InstallStatus =
  "NOT_INSTALLED" | "INSTALLING" | "READY" | "CRASHED" | "INCOMPATIBLE" | "DISABLED";

interface InstallAction {
  label: string;
  disabled: boolean;
  variant: "default" | "destructive";
  onClick?: () => void;
}

// One entry per install status resolves the CTA button's label/variant/handler
// as a data lookup instead of a chain of `installStatus === "x" && ...` render
// branches, since the states are mutually exclusive alternatives selected by a
// single discriminant (with READY additionally split by updateAvailable).
function getInstallAction(
  installStatus: InstallStatus,
  updateAvailable: boolean,
  installLabel: string,
  updateLabel: string,
  onInstall?: () => void,
  onUpdate?: () => void,
  onRetry?: () => void
): InstallAction {
  switch (installStatus) {
    case "NOT_INSTALLED":
      return { label: installLabel, disabled: false, variant: "default", onClick: onInstall };
    case "INSTALLING":
      return { label: "Downloading...", disabled: true, variant: "default" };
    case "READY":
      return updateAvailable
        ? { label: updateLabel, disabled: false, variant: "default", onClick: onUpdate }
        : { label: "Installed", disabled: true, variant: "default" };
    case "CRASHED":
      return { label: "Retry", disabled: false, variant: "destructive", onClick: onRetry };
    case "INCOMPATIBLE":
    case "DISABLED":
      return { label: "Incompatible", disabled: true, variant: "default" };
  }
}

interface PluginCardFooterProps {
  isPluginDisabled: boolean;
  isIncompatible: boolean;
  minimumHostVersion: string;
  maximumHostVersion: string;
  hostVersion: string;
  installStatus: InstallStatus;
  updateAvailable: boolean;
  installLabel: string;
  updateLabel: string;
  installProgress: number;
  isVerifying: boolean;
  onInstall?: () => void;
  onUpdate?: () => void;
  onRetry?: () => void;
}

// The footer CTA area: a "disabled"/"incompatible" notice, or the install/
// update/retry button plus its download progress. Split out from PluginCard
// so this status-driven branching doesn't add to PluginCard's complexity.
export const PluginCardFooter: FC<PluginCardFooterProps> = ({
  isPluginDisabled,
  isIncompatible,
  minimumHostVersion,
  maximumHostVersion,
  hostVersion,
  installStatus,
  updateAvailable,
  installLabel,
  updateLabel,
  installProgress,
  isVerifying,
  onInstall,
  onUpdate,
  onRetry,
}) => {
  if (isPluginDisabled) {
    return <div className="text-sm text-muted-foreground">Plugin disabled</div>;
  }

  if (isIncompatible) {
    return (
      <div className="text-sm text-muted-foreground">
        Requires app {minimumHostVersion}–{maximumHostVersion} (you have {hostVersion})
      </div>
    );
  }

  const action = getInstallAction(
    installStatus,
    updateAvailable,
    installLabel,
    updateLabel,
    onInstall,
    onUpdate,
    onRetry
  );

  return (
    <>
      <Button
        onClick={action.onClick}
        disabled={action.disabled}
        className="w-full"
        variant={action.variant}
      >
        {action.label}
      </Button>

      <div className="mt-2">
        <DownloadProgressIndicator
          progress={installProgress}
          isVerifying={isVerifying}
          isVisible={installStatus === "INSTALLING"}
        />
      </div>
    </>
  );
};
