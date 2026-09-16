import { FC, useEffect } from "react";
import { useGetInstalledPlugins } from "../marketplace/hooks/data-access/useGetInstalledPlugins";
import { pluginSettingsRegistry } from "./hooks/registry/settings/pluginSettingsRegistry";
import { pluginStylesheetRegistry } from "./hooks/registry/stylesheet/pluginStylesheetRegistry";
import {
  captureAppWidePluginSnapshot,
  restoreAppWidePluginSnapshot,
} from "./pluginAppWideAssetSnapshot";
import { ensurePluginStylesheet } from "./utils/ensurePluginStylesheet";
import { loadPluginModule } from "./utils/loadPluginModule";

/**
 * Cluster-scoped code (MainLayout) intentionally has no reach into these
 * app-wide registries (stylesheets, settings tabs) — reconciling stale
 * entries on disable/uninstall is this loader's own responsibility,
 * mirroring how MainLayout reconciles its own cluster-scoped plugin
 * registries against useGetInstalledPlugins.
 */

/**
 * Loads each installed plugin's app-wide stylesheet(s), registered via
 * appWideAPI.registerStylesheets, exactly once — independent of whether the
 * user has ever navigated to a cluster or to that plugin's resource view.
 * Mounted once at the app root (see App.tsx), unlike PluginResourceView's
 * per-view `stylesheet` field, which only loads when that specific view
 * mounts inside a connected cluster.
 *
 * Dynamically importing a plugin bundle that's already been loaded (e.g. by
 * PluginResourceView) is a cache hit — the browser's module registry dedupes
 * import() calls by URL, so this doesn't re-run the plugin's module-level
 * registration code or refetch the bundle.
 */
export const PluginRegistryReconciler: FC = () => {
  const { readyPlugins } = useGetInstalledPlugins();

  useEffect(() => {
    for (const plugin of readyPlugins) {
      loadPluginModule(plugin.pluginId, plugin.bundleChecksum)
        .then(() => {
          // See pluginAppWideAssetSnapshot.ts: a disable/re-enable cycle
          // re-imports the same cached module URL, which resolves without
          // re-running the plugin's top-level register* calls. Restore from
          // the snapshot taken after the first successful import instead of
          // relying on the module re-evaluating.
          if (!restoreAppWidePluginSnapshot(plugin.pluginId, plugin.bundleChecksum)) {
            captureAppWidePluginSnapshot(plugin.pluginId, plugin.bundleChecksum);
          }
          return ensurePluginStylesheet(
            plugin.pluginId,
            pluginStylesheetRegistry.getStylesheets(plugin.pluginId)
          );
        })
        .catch((err) => {
          console.error(`Failed to load stylesheets for plugin ${plugin.pluginId}:`, err);
        });
    }

    const readyIds = new Set(readyPlugins.map((p) => p.pluginId));
    for (const id of pluginStylesheetRegistry.getRegisteredPluginIds()) {
      if (!readyIds.has(id)) pluginStylesheetRegistry.unregisterStylesheets(id);
    }
    for (const id of pluginSettingsRegistry.getRegisteredPluginIds()) {
      if (!readyIds.has(id)) pluginSettingsRegistry.unregisterSettingsTab(id);
    }
  }, [readyPlugins]);

  return null;
};
