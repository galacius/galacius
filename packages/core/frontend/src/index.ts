export * from "./types";

/**
 * @galacius/core — React hooks for galacius plugin development
 *
 * This package exports hooks that plugin frontends can consume. The implementations
 * are provided by the host at runtime via import injection.
 */

export { clusterWideAPI } from "./api/clusterWideAPI";
export { appWideAPI } from "./api/appWideAPI";
export { createPluginBridge } from "./api/frontendBridgeAPI";
export type { PluginBridge, PluginError } from "./api/frontendBridgeAPI";
