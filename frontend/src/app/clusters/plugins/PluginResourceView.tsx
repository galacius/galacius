import { FC, lazy, Suspense, useMemo } from "react";
import { PluginNotInstalledEmptyState } from "../../marketplace/components/PluginNotInstalledEmptyState";
import { ensurePluginStylesheet } from "../../plugins/utils/ensurePluginStylesheet";
import { PluginCrashedError } from "./components/PluginCrashedError";
import { PluginDisabledEmptyState } from "./components/PluginDisabledEmptyState";
import { PluginErrorBoundary } from "./components/PluginErrorBoundary";
import { PluginLoadingFallback } from "./components/PluginLoadingFallback";
import { pluginViewRegistry } from "./hooks/registry/view/pluginViewRegistry";
import { useGetInstalledPlugin } from "./hooks/useGetInstalledPlugin";
import { capturePluginAssetSnapshot, restorePluginAssetSnapshot } from "./pluginAssetSnapshot";

/**
 * Props passed to the dynamically-imported plugin's wrapper component (see
 * PluginViewDynamic below). Must be kept in sync with PluginViewDynamic's
 * usage by hand, since the plugin bundle is loaded at runtime via import()
 * and cannot be statically type-checked.
 */
interface PluginViewsProps {
  activeResource: string;
}

interface PluginResourceViewProps {
  pluginId: string;
  pluginName: string;
  /**
   * Whether the currently active resource belongs to this plugin. A READY
   * plugin's views stay mounted (just visually hidden) even when inactive.
   * Its nav entry is registered as soon as the plugin's module is imported
   * (via clusterWideAPI.registerNavEntry(), mirroring registerViews), so it
   * appears in the sidebar before the user has ever navigated to it.
   */
  isActive: boolean;
  /**
   * The app's current resource name, e.g. "helm-charts". Matched against
   * each of the plugin's registerViews() `name`s to pick which one of the
   * plugin's (possibly several) views is visible — the plugin itself no
   * longer needs to switch on the active resource.
   */
  activeResource: string;
  onGoToMarketplace: () => void;
}

export const PluginResourceView: FC<PluginResourceViewProps> = ({
  pluginId,
  pluginName,
  isActive,
  activeResource,
  onGoToMarketplace,
}) => {
  const { status: pluginStatus, bundleChecksum } = useGetInstalledPlugin(pluginId, {
    hasAttemptedInstall: true,
  });

  // Build dynamic import URL with cache-busting checksum from plugin status
  // The checksum changes when the plugin is reinstalled/updated, invalidating browser cache
  const cacheVersion =
    pluginStatus === "READY" && bundleChecksum ? bundleChecksum.substring(0, 8) : "unknown";
  const pluginAssetUrl = `/api/plugins/${pluginId}/dist/index.js?v=${cacheVersion}`;

  // Memoized on the cache-busted URL so polling doesn't create a new lazy
  // component and remount/re-import the plugin on every tick.
  const PluginViewDynamic = useMemo(
    () =>
      lazy(async () => {
        // The browser's ES module loader caches an evaluated module by exact
        // URL for the page's lifetime. pluginAssetUrl is unchanged across a
        // disable/re-enable cycle (bundleChecksum only changes on
        // reinstall/update), so re-importing it here would resolve from
        // cache without re-running the bundle's top-level registration
        // calls. Restore from a snapshot taken after the first successful
        // import instead of relying on the module re-evaluating.
        if (!restorePluginAssetSnapshot(pluginId, cacheVersion)) {
          // Runtime plugin bundle URL served from the Go backend, not a
          // build-time module Vite can statically analyze.
          await import(/* @vite-ignore */ pluginAssetUrl);
          capturePluginAssetSnapshot(pluginId, cacheVersion);
        }
        const assets = pluginViewRegistry.getViewAssets().filter((a) => a.pluginId === pluginId);
        if (!assets.length) throw new Error(`Plugin ${pluginId} did not register a view`);
        const stylesheets = assets
          .map((a) => a.stylesheet)
          .filter((s): s is Promise<{ default: string }> => !!s);
        await ensurePluginStylesheet(pluginId, stylesheets);

        // Every registered view stays mounted (hidden via display:contents
        // toggling, same trick as the outer wrapper below) so switching
        // between a plugin's own resources doesn't remount its views.
        const PluginViews: FC<PluginViewsProps> = ({ activeResource }) => (
          <>
            {assets.map((asset) => (
              <div
                key={asset.name}
                className={asset.name === activeResource ? "contents" : "hidden"}
              >
                <asset.component />
              </div>
            ))}
          </>
        );
        return { default: PluginViews };
      }),
    [pluginAssetUrl, pluginId, cacheVersion]
  );

  // READY plugins mount unconditionally (kept alive even while another
  // resource is active) so the plugin's own PluginView can use hooks that
  // require an active mount, e.g. clusterWideAPI.useExposeProperties(),
  // before the user has ever navigated to it. (Nav entries, tray families,
  // and event handlers are registered earlier still, at module-import time
  // via clusterWideAPI.registerNavEntry()/registerTrayFamilies()/
  // registerEvents() — see PluginViewDynamic above.)
  if (pluginStatus === "READY") {
    return (
      <PluginErrorBoundary onGoToMarketplace={onGoToMarketplace}>
        <Suspense fallback={isActive ? <PluginLoadingFallback /> : null}>
          {/* display:contents when active so this wrapper generates no box —
              plugin views rely on h-full/flex-1 resolving against the host's
              <main>, which only works if they're direct box-model children
              of it. hidden still fully unmounts-from-layout (but keeps
              mounted in React) when inactive. */}
          <div className={isActive ? "contents" : "hidden"}>
            {/* PluginViewDynamic is memoized on pluginAssetUrl (see above),
                not recreated on every render — safe despite the static-components rule. */}
            {/* eslint-disable-next-line react-hooks/static-components */}
            <PluginViewDynamic activeResource={activeResource} />
          </div>
        </Suspense>
      </PluginErrorBoundary>
    );
  }

  // Non-READY states only matter as full-page takeovers when the user is
  // actually looking at this plugin's resource — otherwise nothing to show.
  if (!isActive) {
    return null;
  }

  if (pluginStatus === "INSTALLING") {
    return <PluginLoadingFallback />;
  }

  if (pluginStatus === "NOT_INSTALLED") {
    return (
      <PluginNotInstalledEmptyState pluginName={pluginName} onGoToMarketplace={onGoToMarketplace} />
    );
  }

  if (pluginStatus === "DISABLED") {
    return <PluginDisabledEmptyState onGoToMarketplace={onGoToMarketplace} />;
  }

  // CRASHED || INCOMPATIBLE
  return <PluginCrashedError onGoToMarketplace={onGoToMarketplace} />;
};
