import { FC } from "react";
import { formatBytes } from "../utils/formatBytes";

interface PluginCardMetadataProps {
  installStatus: "NOT_INSTALLED" | "INSTALLING" | "READY" | "CRASHED" | "INCOMPATIBLE" | "DISABLED";
  installedVersion?: string;
  installedSize?: number;
}

// The installed-version / size row, including its loading-skeleton state.
// Split out from PluginCard so this status-driven text branching doesn't add
// to PluginCard's complexity.
export const PluginCardMetadata: FC<PluginCardMetadataProps> = ({
  installStatus,
  installedVersion,
  installedSize,
}) => {
  if (installStatus === "INSTALLING" && !installedVersion) {
    return (
      <>
        <div className="h-4 w-24 animate-pulse rounded-sm bg-muted" />
        <div className="h-4 w-12 animate-pulse rounded-sm bg-muted" />
      </>
    );
  }

  const versionLabel = installedVersion
    ? `v${installedVersion}`
    : installStatus === "READY"
      ? "Installed (version unknown)"
      : "Not installed";

  return (
    <>
      <div>{versionLabel}</div>
      <div>{installedSize ? formatBytes(installedSize) : null}</div>
    </>
  );
};
