import {
  Button,
  CornerDownLeftIcon,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Divider,
  Input,
  Trash2Icon,
} from "@galacius/design-system";
import { ClipboardGetText } from "@wailsjs/go/app/App";
import { config } from "@wailsjs/go/models";
import { FC, useState } from "react";
import { useGetDefaultNamespaces } from "./modules/base/namespaces/hooks/data-access/useGetDefaultNamespaces";
import { useGetNamespacesForContext } from "./modules/base/namespaces/hooks/data-access/useGetNamespacesForContext";
import { useSaveDefaultNamespaces } from "./modules/base/namespaces/hooks/data-mutation/useSaveDefaultNamespaces";
import { useGetSettings } from "../settings/hooks/data-access/useGetSettings";
import { NamespaceMultiSelect } from "./shared/components/NamespaceMultiSelect";
import { useGetClusterProxy } from "./shared/hooks/data-access/useGetClusterProxy";
import { useGetContextKubeconfigPath } from "./shared/hooks/data-access/useGetContextKubeconfigPath";
import { useSaveClusterProxy } from "./shared/hooks/data-mutation/useSaveClusterProxy";

type SaveStatus = "idle" | "saving" | "error";

function saveLabel(status: SaveStatus): string {
  if (status === "saving") return "Saving…";
  return "Save";
}

interface ClusterSettingsModalProps {
  contextName: string | null;
  onClose: () => void;
}

export const ClusterSettingsModal: FC<ClusterSettingsModalProps> = ({ contextName, onClose }) => {
  const [proxy, setProxy] = useState("");
  const [setupCommand, setSetupCommand] = useState("");
  const [selectedNamespaces, setSelectedNamespaces] = useState<string[]>([]);
  const [manualNamespace, setManualNamespace] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [loadedContextName, setLoadedContextName] = useState<string | null>(null);

  const { data: kubeconfigPath } = useGetContextKubeconfigPath(contextName);
  const { data: clusterProxy } = useGetClusterProxy(contextName);
  const { data: settings } = useGetSettings();
  const proxySetupEnabled = settings?.proxySetupEnabled ?? false;
  const { data: defaultNamespaces } = useGetDefaultNamespaces(contextName);
  const {
    data: availableNamespaces,
    isLoading: isLoadingNamespaces,
    error: namespacesError,
  } = useGetNamespacesForContext(contextName);
  const { mutate: saveClusterProxy } = useSaveClusterProxy();
  const { mutate: saveDefaultNamespaces } = useSaveDefaultNamespaces();

  if (contextName && clusterProxy && contextName !== loadedContextName) {
    setLoadedContextName(contextName);
    setProxy(clusterProxy.httpProxy ?? "");
    setSetupCommand(clusterProxy.setupCommand ?? "");
    setSelectedNamespaces(defaultNamespaces ?? []);
    setStatus("idle");
  } else if (!contextName && loadedContextName !== null) {
    setLoadedContextName(null);
  }

  const removeNamespace = (ns: string) => {
    setSelectedNamespaces((prev) => prev.filter((n) => n !== ns));
  };

  const addManualNamespace = () => {
    const trimmed = manualNamespace.trim();
    if (!trimmed) return;
    setSelectedNamespaces((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setManualNamespace("");
  };

  function handleManualNamespaceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addManualNamespace();
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contextName) return;
    const trimmedProxy = proxy.trim();
    const trimmedCommand = proxySetupEnabled ? setupCommand.trim() : "";
    setProxy(trimmedProxy);
    setSetupCommand(trimmedCommand);
    setStatus("saving");

    let completed = 0;
    let hasError = false;

    const onComplete = () => {
      completed++;
      if (completed === 2) {
        if (hasError) {
          setStatus("error");
        } else {
          onClose();
        }
      }
    };

    saveClusterProxy(
      {
        contextName,
        proxy: config.ClusterProxy.createFrom({
          httpProxy: trimmedProxy,
          httpsProxy: trimmedProxy,
          setupCommand: trimmedCommand,
        }),
      },
      {
        onSuccess: onComplete,
        onError: () => {
          hasError = true;
          onComplete();
        },
      }
    );

    saveDefaultNamespaces(
      {
        contextName,
        namespaces: selectedNamespaces,
      },
      {
        onSuccess: onComplete,
        onError: () => {
          hasError = true;
          onComplete();
        },
      }
    );
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    setProxy(e.clipboardData.getData("text").trim());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      e.preventDefault();
      ClipboardGetText().then((text) => setProxy(text.trim()));
    }
  }

  return (
    <Dialog open={!!contextName} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex flex-col overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-left">Cluster Settings — {contextName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-2">
            <div className="flex flex-col gap-1">
              <span className="text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Kubeconfig
              </span>
              <p className="truncate font-mono text-xs text-foreground" title={kubeconfigPath}>
                {kubeconfigPath || "-"}
              </p>
            </div>

            <Divider />

            <div className="flex flex-col gap-2">
              <label
                htmlFor="cluster-proxy"
                className="text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase"
              >
                HTTP Proxy
              </label>
              <Input
                id="cluster-proxy"
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder="http://proxy.example.com:8080"
                className="font-mono"
              />
            </div>
            <p className="text-left text-xs text-muted-foreground">
              Applied to both HTTP and HTTPS traffic. Takes effect on the next connection.
            </p>

            {proxySetupEnabled && (
              <>
                <Divider />

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="cluster-setup-command"
                    className="text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    Proxy Setup Command (Optional)
                  </label>
                  <Input
                    id="cluster-setup-command"
                    value={setupCommand}
                    onChange={(e) => setSetupCommand(e.target.value)}
                    placeholder="ssm-proxy start --profile my-cluster"
                    className="font-mono"
                  />
                </div>
                <p className="text-left text-xs text-muted-foreground">
                  Automatically spins up your proxy and lets the app connect through it for this
                  cluster session. If it fails, the app still connects normally.
                </p>
              </>
            )}

            <Divider />

            <div className="flex flex-col gap-2">
              <label
                htmlFor="cluster-manual-namespace"
                className="text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase"
              >
                Default Namespaces
              </label>

              <div className="relative">
                <Input
                  id="cluster-manual-namespace"
                  value={manualNamespace}
                  onChange={(e) => setManualNamespace(e.target.value)}
                  onKeyDown={handleManualNamespaceKeyDown}
                  placeholder="Type a namespace and press Enter"
                  className="pr-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Add namespace"
                  onClick={addManualNamespace}
                  disabled={!manualNamespace.trim()}
                  className="absolute top-1/2 right-0.5 -translate-y-1/2"
                >
                  <CornerDownLeftIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-left text-xs text-muted-foreground">
                This setting is useful for manually specifying which namespaces you have access to.
                This is useful when you do not have permissions to list namespaces.
              </p>

              {namespacesError ? (
                <p className="text-xs text-destructive">
                  Failed to load namespaces. Please try again.
                </p>
              ) : (
                <NamespaceMultiSelect
                  namespaces={selectedNamespaces}
                  availableNamespaces={availableNamespaces ?? []}
                  onNamespacesChange={setSelectedNamespaces}
                  disabled={isLoadingNamespaces}
                />
              )}

              {selectedNamespaces.length > 0 && (
                <div className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-md bg-muted/40 p-1">
                  {selectedNamespaces
                    .slice()
                    .sort()
                    .map((ns) => (
                      <div
                        key={ns}
                        className="flex items-center justify-between gap-2 rounded px-2 py-1.5"
                      >
                        <span className="truncate text-sm text-foreground">{ns}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${ns} from default namespaces`}
                          onClick={() => removeNamespace(ns)}
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
              <p className="text-left text-xs text-muted-foreground">
                Select namespaces to use as the default filter when connecting to this context.
                Leave empty for all namespaces.
              </p>
            </div>

            {status === "error" && (
              <p className="text-xs text-destructive">Failed to save. Please try again.</p>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button type="submit" disabled={status === "saving"}>
              {saveLabel(status)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
