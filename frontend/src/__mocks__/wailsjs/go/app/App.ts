export const Connect = (_context: string): Promise<void> => Promise.resolve();
export const GetContexts = (): Promise<string[]> => Promise.resolve([]);
export const GetCurrentContext = (): Promise<string> => Promise.resolve("");
export const GetVersion = (): Promise<string> => Promise.resolve("");
export const GetSettings = (): Promise<unknown> => Promise.resolve(null);
export const SaveSettings = (_settings: unknown): Promise<void> => Promise.resolve();
export const GetClusterProxy = (): Promise<unknown> => Promise.resolve(null);
export const SaveClusterProxy = (_proxy: unknown): Promise<void> => Promise.resolve();
export const ClipboardGetText = (): Promise<string> => Promise.resolve("");
export const GetDefaultShell = (): Promise<string> => Promise.resolve("");
export const GetAppDir = (): Promise<string> => Promise.resolve("");
export const GetInstallSource = (): Promise<string> => Promise.resolve("manual");
export const OpenAppDir = (): Promise<void> => Promise.resolve();
export const IsResourceForbidden = (_resource: string, _namespace: string): Promise<boolean> =>
  Promise.resolve(false);
export const DownloadPodLogs = (
  _contextName: string,
  _ns: string,
  _pod: string,
  _container: string
): Promise<void> => Promise.resolve();
export const CheckForUpdate = (): Promise<void> => Promise.resolve(undefined);
export const GetLastUpdateCheckResult = (): Promise<unknown> => Promise.resolve(null);
export const PerformUpdate = (): Promise<void> => Promise.resolve();
export const GetActiveKubeconfigPaths = (): Promise<string[]> => Promise.resolve([]);
export const GetContextKubeconfigPath = (_context: string): Promise<string> => Promise.resolve("");
export const SaveKubeconfigPaths = (_paths: string[]): Promise<void> => Promise.resolve();
export const SaveLocaleTimezone = (_tz: string): Promise<void> => Promise.resolve();
export const UpdateConfigMap = (
  _namespace: string,
  _name: string,
  _data: Record<string, string>
): Promise<void> => Promise.resolve();
export const DeleteResourceQuota = (_namespace: string, _name: string): Promise<void> =>
  Promise.resolve();
export const DeletePod = (_namespace: string, _name: string): Promise<void> => Promise.resolve();
export const DeletePods = (_items: unknown): Promise<void> => Promise.resolve();
export const DeleteReplicaSet = (_namespace: string, _name: string): Promise<void> =>
  Promise.resolve();
export const DeleteNamespace = (_name: string): Promise<void> => Promise.resolve();
export const DeleteNamespaces = (_names: string[]): Promise<void> => Promise.resolve();
export const DeleteNode = (_name: string): Promise<void> => Promise.resolve();
export const DeleteNodes = (_names: string[]): Promise<void> => Promise.resolve();
export const GetNamespaceYAML = (_name: string): Promise<string> => Promise.resolve("");
export const UpdateNamespaceYAML = (_yamlString: string): Promise<void> => Promise.resolve();
export const GetPluginBackendAddr = (_pluginID: string): Promise<string> =>
  Promise.resolve("127.0.0.1:8080");
export const GetPluginsFromMarketplace = (): Promise<unknown[]> => Promise.resolve([]);
export const IsMarketplaceEnabled = (): Promise<boolean> => Promise.resolve(true);
export const IsPrivateRepoAccess = (): Promise<boolean> => Promise.resolve(true);
