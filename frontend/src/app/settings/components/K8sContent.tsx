import {
  Button,
  FileTextIcon,
  FolderSyncIcon,
  renderSuccessToast,
  Trash2Icon,
} from "@galacius/design-system";
import { FC, useEffect, useRef } from "react";
import { useGetActiveKubeconfigPaths } from "../hooks/data-access/useGetActiveKubeconfigPaths";
import { useGetSettings } from "../hooks/data-access/useGetSettings";
import { usePickKubeconfigPath } from "../hooks/data-mutation/usePickKubeconfigPath";
import { useSaveKubeconfigPaths } from "../hooks/data-mutation/useSaveKubeconfigPaths";

export const K8sContent: FC = () => {
  const { data: settings } = useGetSettings();
  const { data: activePaths } = useGetActiveKubeconfigPaths();
  const { mutate: saveKubeconfigPaths } = useSaveKubeconfigPaths();
  const { mutateAsync: pickKubeconfigPath } = usePickKubeconfigPath();

  const seededRef = useRef(false);

  const paths = settings?.kubeconfigPaths ?? [];
  const activePathSet = new Set(activePaths);

  // Seed with active kubeconfig paths when nothing is saved yet
  useEffect(() => {
    if (seededRef.current || !settings || !activePaths) return;
    if ((settings.kubeconfigPaths ?? []).length > 0) {
      seededRef.current = true;
      return;
    }
    if (activePaths.length === 0) return;
    seededRef.current = true;
    saveKubeconfigPaths(activePaths);
  }, [settings, activePaths, saveKubeconfigPaths]);

  async function handleSync() {
    const picked = await pickKubeconfigPath().catch(() => "");
    if (!picked || paths.includes(picked)) return;
    saveKubeconfigPaths([...paths, picked], {
      onSuccess: () => renderSuccessToast({ title: "Kubeconfig added", description: picked }),
    });
  }

  function handleRemove(path: string) {
    saveKubeconfigPaths(
      paths.filter((p) => p !== path),
      {
        onSuccess: () => renderSuccessToast({ title: "Kubeconfig removed", description: path }),
      }
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-left text-xs font-semibold tracking-wider uppercase">Kubeconfig Syncs</p>
        <Button onClick={handleSync} className="w-fit">
          <FolderSyncIcon className="size-4" />
          Sync Files and Folders
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-left text-xs font-semibold tracking-wider uppercase">Synced Items</p>
        {paths.length === 0 ? (
          <p className="text-sm text-muted-foreground">No kubeconfig files synced.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {paths.map((p) => (
              <div key={p} className="flex items-center gap-3 rounded-md border px-3 py-2.5">
                <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate font-mono text-sm">{p}</span>
                {!activePathSet.has(p) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(p)}
                    aria-label={`Remove ${p}`}
                    className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
