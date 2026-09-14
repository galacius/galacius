import type { ComponentType } from "react";
import type { NavEntry, SharedUnifiedTrayContentProps } from "../types";

/**
 * Hook to access cluster-scoped property values exposed to plugins. Valid
 * only within the single-cluster view — i.e. inside MainLayout's subtree
 * (MainLayoutProvider → DetailDrawerProvider). Calling this from a component
 * rendered outside that subtree (e.g. Settings, Marketplace, or any future
 * app-wide screen) will throw, because the underlying host state
 * (DetailDrawerContext) has no provider there. A future appWideAPI will
 * cover capabilities that don't have this constraint.
 *
 * Example:
 *   const { activeContext, activeNamespaces, activeResource, availableNamespaces, resourceLinks, unifiedTray } = clusterWideAPI.useExposeProperties();
 *   resourceLinks.pod(namespace, podName);  // Opens pod detail drawer
 *   unifiedTray.openTab("my-plugin-family", { pluginId: "my-plugin", label: "...", dedupeKey: "..." });
 *
 * This signature is duplicated from the host's real implementation at
 * frontend/src/expose/hooks/useExposeProperties.ts (which this package can't
 * import directly — see main.tsx's vendor injection). If that hook's return
 * type changes, update this signature to match.
 */
function useExposeProperties(): {
  activeContext: string;
  activeNamespaces: string[];
  activeResource: string;
  availableNamespaces: Array<{ Name: string }>;
  resourceLinks: Record<string, (namespace: string, name: string) => void>;
  unifiedTray: { openTab: (family: string, params: unknown) => void } | null;
} {
  // This function is replaced at runtime by the host's actual implementation.
  // If you see this error, useExposeProperties was called outside of a plugin context.
  throw new Error(
    "clusterWideAPI.useExposeProperties is not available. This hook must be imported from " +
      "'@galacius/core' within a plugin bundle loaded by the galacius host."
  );
}

/**
 * Hook to access cluster-scoped plain functions exposed to plugins. Valid
 * only within the single-cluster view — same constraints as useExposeProperties().
 *
 * Example:
 *   const { onNavigateToView } = clusterWideAPI.useExposeMethods();
 *
 * This signature is duplicated from the host's real implementation at
 * frontend/src/expose/hooks/useExposeMethods.ts (which this package can't
 * import directly — see main.tsx's vendor injection). If that hook's return
 * type changes, update this signature to match.
 */
function useExposeMethods(): {
  onNavigateToView: (view: string) => void;
} {
  // This function is replaced at runtime by the host's actual implementation.
  // If you see this error, useExposeMethods was called outside of a plugin context.
  throw new Error(
    "clusterWideAPI.useExposeMethods is not available. This hook must be imported from " +
      "'@galacius/core' within a plugin bundle loaded by the galacius host."
  );
}

/**
 * Register this plugin's event handlers with the host's plugin event bus.
 * Called once by a plugin, typically at module scope alongside
 * registerViews/registerNavEntry/registerTrayFamilies. Re-registering under
 * the same plugin ID replaces its handlers; the host also unregisters them
 * automatically when the plugin is uninstalled.
 *
 * Example:
 *   const queryClient = appWideAPI.getQueryClient();
 *   clusterWideAPI.registerEvents("helm", {
 *     "helm:release-updated": (payload) => { queryClient.invalidateQueries(...); },
 *   });
 *
 * This function is replaced at runtime by the host's actual implementation
 * (injected in frontend/src/expose/index.tsx). If you see this error, registerEvents
 * was called before the host initialized the injection.
 */
function registerEvents(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pluginId: string,
  // Plugins type each handler's payload with its own event-specific shape
  // rather than `unknown`, so this must accept `any` here — a `(payload:
  // unknown) => void` signature would reject those narrower handlers.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  handlers: Record<string, (payload: any) => void>
): void {
  // This function is replaced at runtime by the host's actual implementation.
  // If you see this error, registerEvents was called before the host injected the real implementation.
  throw new Error(
    "clusterWideAPI.registerEvents is not available. This function must be imported from " +
      "'@galacius/core' within a plugin bundle loaded by the galacius host."
  );
}

/**
 * Register this plugin's tray-family content components with the host's
 * unified bottom tray. Called once by a plugin, typically at module scope
 * alongside registerViews/registerNavEntry, so the plugin's tray content is
 * available as soon as the plugin's bundle is imported — no component needs
 * to mount first.
 *
 * Example:
 *   clusterWideAPI.registerTrayFamilies("helm", HELM_TRAY_FAMILIES);
 *
 * This function is replaced at runtime by the host's actual implementation
 * (injected in frontend/src/expose/index.tsx). If you see this error, registerTrayFamilies
 * was called before the host initialized the injection.
 */
function registerTrayFamilies(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pluginId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  families: Record<string, ComponentType<SharedUnifiedTrayContentProps>> | undefined
): void {
  // This function is replaced at runtime by the host's actual implementation.
  // If you see this error, registerTrayFamilies was called before the host injected the real implementation.
  throw new Error(
    "clusterWideAPI.registerTrayFamilies is not available. This function must be imported from " +
      "'@galacius/core' within a plugin bundle loaded by the galacius host."
  );
}

/**
 * Register one or more named view components with the host. Called by
 * plugins to provide their main view UI, one per resource the plugin owns.
 * `name` must match the resource's nav entry `view` value (see
 * registerNavEntry) — the host mounts whichever registered view's `name`
 * equals the currently active resource and keeps the rest hidden, so a
 * plugin no longer needs to switch on the active resource itself. Each view
 * may optionally supply its own `stylesheet`, loaded only when that view
 * mounts — for a plugin's global stylesheet (e.g. Tailwind output shared
 * across all its views), use appWideAPI.registerStylesheets instead, which
 * loads once at the app level regardless of which view is active.
 *
 * Example:
 *   clusterWideAPI.registerViews("helm", [
 *     { name: "helm-charts", component: HelmChartListView, stylesheet: import("./chart-list.css") },
 *     { name: "helm-releases", component: HelmReleaseListView },
 *   ]);
 *
 * This function is replaced at runtime by the host's actual implementation
 * (injected in frontend/src/expose/index.tsx). If you see this error, registerViews
 * was called before the host initialized the injection.
 */
function registerViews(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pluginId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configs: Array<{
    name: string;
    component: ComponentType;
    stylesheet?: Promise<{ default: string }>;
  }>
): void {
  // This function is replaced at runtime by the host's actual implementation.
  // If you see this error, registerViews was called before the host injected the real implementation.
  throw new Error(
    "clusterWideAPI.registerViews is not available. This function must be imported from " +
      "'@galacius/core' within a plugin bundle loaded by the galacius host."
  );
}

/**
 * Register this plugin's sidebar nav entry with the host. Called once by a
 * plugin, typically at module scope alongside registerViews, so the entry
 * appears in the sidebar as soon as the plugin's bundle is imported — no
 * component needs to mount first.
 *
 * Example:
 *   clusterWideAPI.registerNavEntry("helm", HELM_NAV_ENTRY);
 *
 * This function is replaced at runtime by the host's actual implementation
 * (injected in frontend/src/expose/index.tsx). If you see this error, registerNavEntry
 * was called before the host initialized the injection.
 */
function registerNavEntry(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pluginId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  navEntry: NavEntry<string> | undefined
): void {
  // This function is replaced at runtime by the host's actual implementation.
  // If you see this error, registerNavEntry was called before the host injected the real implementation.
  throw new Error(
    "clusterWideAPI.registerNavEntry is not available. This function must be imported from " +
      "'@galacius/core' within a plugin bundle loaded by the galacius host."
  );
}

/**
 * Cluster-scoped capabilities exposed to plugins, valid only within the
 * single-cluster view (see useExposeProperties() for the exact constraint).
 * A future appWideAPI namespace will cover capabilities that don't have
 * this constraint.
 *
 * Example:
 *   const { onNavigateToView } = clusterWideAPI.useExposeMethods();
 */
export const clusterWideAPI = {
  useExposeProperties,
  useExposeMethods,
  registerViews,
  registerNavEntry,
  registerTrayFamilies,
  registerEvents,
};
