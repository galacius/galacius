import type { dto } from "@wailsjs/go/models";
import { useMemo } from "react";
import { maskTerminalStatus } from "../../shared/utils/maskTerminalStatus";
import { PluginManifest } from "./data-access/useGetPluginsFromMarketplace";

export interface InstalledCatalogEntry {
  installedPlugin: dto.InstalledPlugin;
  manifest: dto.InstalledPlugin | PluginManifest;
}

export interface AvailableCatalogEntry {
  id: string;
  manifest: PluginManifest | undefined;
  installStatus: dto.InstalledPlugin | undefined;
}

// Builds the installed/available sections with deduplication.
// "Installed" is reserved for plugins that are actually on disk (READY /
// CRASHED / INCOMPATIBLE) *and* have a resolvable manifest — INSTALLING is
// still in progress, and a manifestless entry (e.g. crashed before its
// .plugin-metadata.json was ever written, or metadata corrupted, with no
// matching marketplace listing to fall back on) can't render a real
// PluginCard either way. Both cases are pushed to "Available" instead,
// where the existing manifest-optional rendering already covers them:
// a live progress bar when the manifest is known, PluginCardFallback when
// it isn't. This keeps manifest non-optional for everything in "installed".
export function usePluginCatalog(
  installedPlugins: dto.InstalledPlugin[],
  attemptedInstalls: Set<string>,
  marketplacePlugins: PluginManifest[]
): { installed: InstalledCatalogEntry[]; available: AvailableCatalogEntry[] } {
  return useMemo(() => {
    const marketplacePluginsById = new Map(marketplacePlugins.map((p) => [p.id, p]));
    // Plugins that belong in "Available" beyond the plain marketplace catalog:
    // still installing, or installed-but-manifestless. Keyed by pluginId.
    const extraByPluginId = new Map<string, dto.InstalledPlugin>();

    const installed: InstalledCatalogEntry[] = [];

    for (const installedPlugin of installedPlugins) {
      const hasAttempted = attemptedInstalls.has(installedPlugin.pluginId);
      const displayStatus = maskTerminalStatus(installedPlugin.status, hasAttempted);
      if (displayStatus === "NOT_INSTALLED") continue;

      if (displayStatus === "INSTALLING") {
        extraByPluginId.set(installedPlugin.pluginId, installedPlugin);
        continue;
      }

      const marketplaceManifest = marketplacePluginsById.get(installedPlugin.pluginId);
      const manifest = marketplaceManifest ?? (installedPlugin.id ? installedPlugin : undefined);
      if (manifest) installed.push({ installedPlugin, manifest });
      else extraByPluginId.set(installedPlugin.pluginId, installedPlugin);
    }

    const installedIds = new Set(installed.map(({ installedPlugin }) => installedPlugin.pluginId));

    const available: AvailableCatalogEntry[] = [];
    for (const manifest of marketplacePlugins) {
      if (installedIds.has(manifest.id)) continue;
      available.push({
        id: manifest.id,
        manifest,
        installStatus: extraByPluginId.get(manifest.id),
      });
    }

    // Entries with no matching marketplace listing (catalog changed mid-install,
    // or a crashed/corrupted install the catalog never covered) still need to
    // render somewhere — surface them via PluginCardFallback.
    for (const [pluginId, installStatus] of extraByPluginId) {
      if (!marketplacePluginsById.has(pluginId) && !installedIds.has(pluginId)) {
        available.push({ id: pluginId, manifest: undefined, installStatus });
      }
    }

    return { installed, available };
  }, [installedPlugins, attemptedInstalls, marketplacePlugins]);
}
