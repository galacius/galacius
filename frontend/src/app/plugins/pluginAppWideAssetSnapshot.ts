import type { PluginFooterWidget, PluginSettingsTab } from "@galacius/core";
import { pluginFooterRegistry } from "./hooks/registry/footer/pluginFooterRegistry";
import { pluginSettingsRegistry } from "./hooks/registry/settings/pluginSettingsRegistry";
import { pluginStylesheetRegistry } from "./hooks/registry/stylesheet/pluginStylesheetRegistry";

interface PluginAppWideAssetSnapshot {
  bundleChecksum: string | undefined;
  stylesheets: Array<Promise<{ default: string }>>;
  settingsTab?: PluginSettingsTab;
  footerWidget?: PluginFooterWidget;
}

const snapshots = new Map<string, PluginAppWideAssetSnapshot>();

/**
 * Captures whatever a plugin bundle's module-eval-time registration calls
 * (registerStylesheets/registerSettingsTab/registerFooterWidget) just populated into the app-wide
 * registries, keyed by pluginId + bundleChecksum. Call right after a fresh
 * `import()` of a plugin bundle succeeds.
 */
export function captureAppWidePluginSnapshot(
  pluginId: string,
  bundleChecksum: string | undefined
): void {
  snapshots.set(pluginId, {
    bundleChecksum,
    stylesheets: pluginStylesheetRegistry.getStylesheets(pluginId),
    settingsTab: pluginSettingsRegistry.getSettingsTab(pluginId),
    footerWidget: pluginFooterRegistry.getFooterWidget(pluginId),
  });
}

/**
 * Re-populates the app-wide registries from a previously captured snapshot,
 * without re-importing the plugin bundle. Needed because the browser's ES
 * module loader caches an evaluated module by URL for the page's lifetime —
 * re-importing the same URL (same pluginId + bundleChecksum, e.g. after a
 * disable/re-enable cycle) resolves instantly from cache WITHOUT re-running
 * the module's top-level registration calls, which would otherwise leave the
 * plugin's stylesheets, settings tab, and footer widgets missing until a full page reload
 * resets the module cache. Mirrors
 * clusters/plugins/pluginAssetSnapshot.ts's restorePluginAssetSnapshot for
 * the cluster-scoped registries. Returns true if a matching snapshot was
 * restored.
 */
export function restoreAppWidePluginSnapshot(
  pluginId: string,
  bundleChecksum: string | undefined
): boolean {
  const snapshot = snapshots.get(pluginId);
  if (!snapshot || snapshot.bundleChecksum !== bundleChecksum) return false;

  if (snapshot.stylesheets.length > 0)
    pluginStylesheetRegistry.registerStylesheets(pluginId, snapshot.stylesheets);
  if (snapshot.settingsTab)
    pluginSettingsRegistry.registerSettingsTab(pluginId, snapshot.settingsTab);
  if (snapshot.footerWidget)
    pluginFooterRegistry.registerFooterWidget(pluginId, snapshot.footerWidget);

  return true;
}
