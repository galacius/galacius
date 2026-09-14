/**
 * Pure utility functions for MainLayout plugin lifecycle logic.
 * Extracted for testability and clarity.
 */

/**
 * Determines if a plugin with the given status should be mounted in the cluster view.
 * Uses an allowlist: only READY and INSTALLING plugins are mounted.
 * DISABLED, CRASHED, INCOMPATIBLE, and NOT_INSTALLED plugins are excluded.
 */
export function isPluginMounted(status: string): boolean {
  return status === "READY" || status === "INSTALLING";
}

/**
 * Determines if activeResource should be reset to "overview" because the
 * currently-viewed resource belongs to a plugin that is no longer mounted.
 * This prevents blank screens when a user is viewing a plugin that gets
 * disabled/removed/crashes during an active session.
 *
 * @param activeResource - The currently active resource view name
 * @param mountedPluginIds - Set of plugin IDs that are currently mounted
 * @param viewTypeToPluginId - Map from view name to plugin ID (from registry)
 */
export function shouldResetActiveResource(
  activeResource: string,
  mountedPluginIds: Set<string>,
  viewTypeToPluginId: Record<string, string>
): boolean {
  const activePluginId = viewTypeToPluginId[activeResource];
  return !!(activePluginId && !mountedPluginIds.has(activePluginId));
}
