import {
  ArrowUpCircleIcon,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ExternalLinkIcon,
  Loader2Icon,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@galacius/design-system";
import { FC } from "react";
import { useOpenBrowserURL } from "../shared/hooks/useOpenBrowserURL";
import { useGetInstallSource } from "./hooks/data-access/useGetInstallSource";
import { usePerformUpdateApp } from "./hooks/data-mutation/usePerformUpdateApp";

const INSTALL_SOURCE_LABELS: Record<string, string> = {
  homebrew: "Homebrew",
  apt: "APT",
  winget: "winget",
};

const UPGRADE_COMMANDS: Record<string, string[]> = {
  homebrew: ["brew update", "brew upgrade galacius"],
  apt: ["sudo apt upgrade"],
  winget: ["winget upgrade galacius.Galacius"],
};

interface UpdateModalProps {
  open: boolean;
  onClose: () => void;
  currentVersion: string;
  latestVersion: string;
  releaseURL: string;
  downloadSize: string;
}

export const UpdateModal: FC<UpdateModalProps> = ({
  open,
  onClose,
  currentVersion,
  latestVersion,
  releaseURL,
  downloadSize,
}) => {
  const { mutate: performUpdateApp, isPending: updating, error, reset } = usePerformUpdateApp();
  const openBrowserURL = useOpenBrowserURL();
  const { data: installSource = "manual" } = useGetInstallSource();
  const isPackageManagerInstalled = installSource !== "manual";

  function handleClose() {
    reset();
    onClose();
  }

  function handleUpdate() {
    performUpdateApp(latestVersion);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !updating && handleClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircleIcon className="size-4 shrink-0 text-primary" />
            Update Available
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <span className="text-left text-muted-foreground">Current version</span>
          <span className="text-right font-mono">{currentVersion}</span>
          <span className="text-left text-muted-foreground">New version</span>
          <span className="text-right font-mono font-semibold text-primary">{latestVersion}</span>
          {Boolean(downloadSize) && (
            <>
              <span className="text-left text-muted-foreground">Download size</span>
              <span className="text-right">{downloadSize}</span>
            </>
          )}
        </div>

        {isPackageManagerInstalled && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <p className="mb-1 font-medium">
              Installed via {INSTALL_SOURCE_LABELS[installSource] ?? installSource}
            </p>
            <p className="mb-1 text-muted-foreground">Run the following to upgrade:</p>
            <Textarea variant="code" value={UPGRADE_COMMANDS[installSource]?.join("\n")} disabled />
          </div>
        )}

        <Button
          variant="link"
          onClick={() => openBrowserURL(releaseURL)}
          className="h-auto w-fit gap-1.5 p-0 text-sm"
        >
          <ExternalLinkIcon className="size-3.5" />
          What&apos;s new
        </Button>

        {error && <p className="text-xs text-destructive">{error.message}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={updating}>
            Cancel
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex">
                  <Button
                    onClick={handleUpdate}
                    disabled={updating || isPackageManagerInstalled}
                    className="w-full"
                  >
                    {updating ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Updating…
                      </>
                    ) : (
                      <>
                        <ArrowUpCircleIcon className="size-4" />
                        Update Now
                      </>
                    )}
                  </Button>
                </span>
              }
            />
            {isPackageManagerInstalled && (
              <TooltipContent side="bottom">
                Auto-update is unavailable for package-manager installs. See the upgrade
                instructions above.
              </TooltipContent>
            )}
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
