// Shared HTTP-fetch machinery for calling a plugin's own backend directly
// over localhost, bypassing the host for every business call. See
// galacius-plugins' architecture notes: the host still owns process
// lifecycle (spawn, handshake, crash detection) and hands out each plugin's
// backend address via GetPluginBackendAddr, but every business call goes
// straight from plugin frontend to plugin backend over HTTP.
//
// A plugin's frontend builds to a standalone ES module and is loaded via
// dynamic import() from a separate bundle — it cannot resolve host-only
// aliases. Since the plugin runs same-origin in the host app's own window,
// `window.go`/`window.runtime` are available at runtime regardless of which
// bundle the calling code came from.

declare global {
  interface Window {
    go: {
      app: {
        App: {
          GetPluginBackendAddr(pluginID: string): Promise<string>;
        };
      };
    };
  }
}

export type PluginError = {
  code: string;
  message: string;
};

export type PluginBridge = {
  fetchWithRetry: <T>(method: string, payload: unknown) => Promise<T>;
  invalidateBackendAddrCache: () => void;
};

/**
 * Builds the fetch/retry/address-caching machinery for one plugin. Each
 * plugin's frontend calls this once with its own plugin ID and API path
 * segment, then wraps the returned `fetchWithRetry` in its own typed,
 * per-endpoint exports (payload shapes differ per plugin, so those stay in
 * the plugin's own bridge module).
 *
 * Example:
 *   const { fetchWithRetry } = createPluginBridge("helm");
 *   export const ListHelmCharts = (): Promise<HelmChart[]> =>
 *     fetchWithRetry<HelmChart[]>("listCharts", {});
 */
export function createPluginBridge(pluginID: string): PluginBridge {
  // Module-level cache for backend address, scoped to this plugin's bridge instance.
  let backendAddr: string | null = null;
  let addressFetchPromise: Promise<string> | null = null;

  function invalidateBackendAddrCache(): void {
    backendAddr = null;
    addressFetchPromise = null;
  }

  async function getBackendAddr(): Promise<string> {
    if (backendAddr) return backendAddr;
    if (addressFetchPromise) return addressFetchPromise;
    addressFetchPromise = window.go.app.App.GetPluginBackendAddr(pluginID)
      .then((addr) => {
        backendAddr = addr;
        addressFetchPromise = null;
        return addr;
      })
      .catch((err) => {
        addressFetchPromise = null;
        throw err;
      });
    return addressFetchPromise;
  }

  async function doFetch<T>(method: string, payload: unknown, addr: string): Promise<T> {
    const response = await fetch(`http://${addr}/api/${pluginID}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errBody = (await response.json()) as PluginError;
      throw errBody;
    }
    return (await response.json()) as T;
  }

  async function fetchWithRetry<T>(method: string, payload: unknown): Promise<T> {
    const addr = await getBackendAddr();
    try {
      return await doFetch<T>(method, payload, addr);
    } catch (err) {
      // Only a thrown PluginError (backend responded, just with an error body) should NOT retry.
      // A raised TypeError from fetch() itself (network/connection failure) means the cached
      // address is stale -> refetch once and retry once.
      if (err instanceof TypeError) {
        invalidateBackendAddrCache();
        try {
          const freshAddr = await getBackendAddr();
          return await doFetch<T>(method, payload, freshAddr);
        } catch {
          throw {
            code: "PLUGIN_UNAVAILABLE",
            message: "Plugin backend unreachable",
          } as PluginError;
        }
      }
      throw err;
    }
  }

  return { fetchWithRetry, invalidateBackendAddrCache };
}
