import { Button, Dialog, DialogContent, Divider, Loader2Icon } from "@galacius/design-system";
import { FC } from "react";
import pkg from "../../../package.json";
import logo from "../../assets/images/logo-universal.png";
import { useGetInstalledPlugins } from "../marketplace/hooks/data-access/useGetInstalledPlugins";
import { formatBytes } from "../marketplace/utils/formatBytes";
import { useOpenBrowserURL } from "../shared/hooks/useOpenBrowserURL";
import { useCheckForUpdate } from "../updater/hooks/data-mutation/useCheckForUpdate";

// Strip leading non-numeric characters (^, ~, v, "go", etc.)
function clean(v: string): string {
  return v.replace(/^[^\d]+/, "");
}

const TECH: Array<{ label: string; version: string }> = [
  { label: "React", version: clean(pkg.dependencies.react) },
  { label: "Vite", version: clean(pkg.devDependencies.vite) },
  { label: "Tailwind CSS", version: clean(pkg.devDependencies.tailwindcss) },
];

interface Payload {
  version: string;
  go: string;
  wails: string;
  k8sClient: string;
  appSizeBytes: string;
  installSource: string;
}

interface Props {
  payload: Payload;
  onClose: () => void;
  onUpdateAvailable: () => void;
}

export const AboutModal: FC<Props> = ({ payload, onClose, onUpdateAvailable }) => {
  const { checkingForUpdate, checkForUpdate } = useCheckForUpdate(onUpdateAvailable);
  const openBrowserURL = useOpenBrowserURL();

  const runtimeTech = [
    { label: "Go", version: clean(payload.go) },
    { label: "Wails", version: clean(payload.wails) },
    { label: "K8s Client", version: clean(payload.k8sClient) },
    { label: "Node", version: clean(__NODE_VERSION__) },
    ...TECH,
  ];

  const { pluginStatuses } = useGetInstalledPlugins();
  const installedPlugins = pluginStatuses.filter((p) => p.size !== undefined);

  const appSizeBytes = Number(payload.appSizeBytes);
  const hasAppSize =
    payload.appSizeBytes !== "" && !Number.isNaN(appSizeBytes) && appSizeBytes >= 0;
  const totalBytes =
    (hasAppSize ? appSizeBytes : 0) + installedPlugins.reduce((sum, p) => sum + (p.size ?? 0), 0);
  const hasSizeInfo = hasAppSize || installedPlugins.length > 0;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent aria-label="About Galacius" size="sm">
        <div className="flex flex-col items-center px-8 pt-8 pb-6 text-center">
          <img src={logo} alt="Galacius" className="mb-4 h-16 w-16 rounded-2xl" />

          <h1 className="text-lg font-semibold">Galacius</h1>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {payload.version}
            {payload.installSource && <> · {payload.installSource}</>}
          </p>

          <Divider className="my-5" />

          {/* Built with */}
          <div className="w-full text-left">
            <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Built with
            </p>
            <div className="flex flex-col gap-1">
              {runtimeTech.map(({ label, version }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-mono text-xs">{version}</span>
                </div>
              ))}
            </div>
          </div>

          <Divider className="my-5" />

          {/* Author */}
          <div className="w-full text-left">
            <p className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Author
            </p>
            <p className="text-sm font-medium">{import.meta.env.VITE_AUTHOR_NAME || "-"}</p>
            {import.meta.env.VITE_AUTHOR_URL ? (
              <Button
                variant="link"
                onClick={() => openBrowserURL(import.meta.env.VITE_AUTHOR_URL)}
                className="mt-0.5 h-auto p-0 font-mono text-xs text-muted-foreground underline-offset-2 hover:text-foreground"
              >
                {import.meta.env.VITE_AUTHOR_URL.replace(/^https?:\/\//, "")}
              </Button>
            ) : (
              "-"
            )}
          </div>

          {hasSizeInfo && (
            <>
              <Divider className="my-5" />

              {/* Storage */}
              <div className="w-full text-left">
                <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Storage
                </p>
                <div className="flex flex-col gap-1">
                  {hasAppSize && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">App</span>
                      <span className="font-mono text-xs">{formatBytes(appSizeBytes)}</span>
                    </div>
                  )}
                  {installedPlugins.map((p) => (
                    <div key={p.pluginId} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{p.pluginId} (plugin)</span>
                      <span className="font-mono text-xs">{formatBytes(p.size ?? 0)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-muted/50 pt-1">
                    <span className="text-xs font-medium text-muted-foreground">Total</span>
                    <span className="font-mono text-xs font-medium">{formatBytes(totalBytes)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <Divider className="my-5" />

          {/* Check for Updates */}
          <Button
            variant="outline"
            onClick={checkForUpdate}
            disabled={checkingForUpdate}
            className="w-full"
            aria-label="Check for Updates"
          >
            {checkingForUpdate ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Checking…
              </>
            ) : (
              "Check for Updates"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
