import { NavItem } from "@galacius/core";
import { ErrorBoundary, renderErrorToast } from "@galacius/design-system";
import { FC, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGetInstalledPlugins } from "../marketplace/hooks/data-access/useGetInstalledPlugins";
import {
  formatForbiddenNamespaces,
  useCatchForbiddenResource,
} from "../shared/hooks/async-events/useCatchForbiddenResource";
import { ActiveResourceView } from "./ActiveResourceView";
import { isPluginMounted, shouldResetActiveResource } from "./MainLayout.utils";
import { MainLayoutProvider } from "./MainLayoutContext";
import { useGetDefaultNamespaces } from "./modules/base/namespaces/hooks/data-access/useGetDefaultNamespaces";
import { useGetNamespaceNames } from "./modules/base/namespaces/hooks/data-access/useGetNamespaceNames";
import { useSetActiveNamespaces } from "./modules/base/namespaces/hooks/data-mutation/useSetActiveNamespaces";
import { RESOURCE_LABEL, ViewType } from "./navConfig";
import { NavSidebar } from "./NavSidebar";
import { pluginEventRegistry } from "./plugins/hooks/registry/event/pluginEventRegistry";
import { pluginNavRegistry } from "./plugins/hooks/registry/nav/pluginNavRegistry";
import { usePluginNavEntries } from "./plugins/hooks/registry/nav/usePluginNavEntries";
import { pluginTrayRegistry } from "./plugins/hooks/registry/tray/pluginTrayRegistry";
import { usePluginTrayFamilies } from "./plugins/hooks/registry/tray/usePluginTrayFamilies";
import { pluginViewRegistry } from "./plugins/hooks/registry/view/pluginViewRegistry";
import { PluginDisabledSubscriber } from "./plugins/PluginDisabledSubscriber";
import { PluginResourceView } from "./plugins/PluginResourceView";
import { DetailBlock } from "./shared/components/details/DetailBlock";
import { NamespaceMultiSelect } from "./shared/components/NamespaceMultiSelect";
import { UnifiedTrayOutlet } from "./shared/components/trays/unified/UnifiedTrayOutlet";
import { unifiedTrayRegistry } from "./shared/components/trays/unified/unifiedTrayRegistry";

interface MainLayoutProps {
  activeContext: string;
  onOpenMarketplace: () => void;
}

export const MainLayout: FC<MainLayoutProps> = ({ activeContext, onOpenMarketplace }) => {
  // Bounds the unified tray's portal container so it stays within MainLayout's
  // own viewport instead of the whole document body — otherwise the tray's
  // fixed-to-body positioning overlaps AppFooter, which is a sibling of
  // MainLayout, not a descendant of it.
  const trayContainerRef = useRef<HTMLDivElement>(null);

  const [activeResource, setActiveResource] = useState<ViewType>("overview");
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(["workloads", "network", "config", "storage", "access-control"])
  );

  const [namespaces, setNamespaces] = useState<string[]>([]);
  const { mutate: setActiveNamespaces } = useSetActiveNamespaces();
  const { data: namespaceNames = [] } = useGetNamespaceNames(activeContext);
  const { data: defaultNamespaces } = useGetDefaultNamespaces(activeContext);
  // Tracks the last-applied "<context>:<defaults>" snapshot, so the seed below
  // re-applies both on first load for a context AND whenever the persisted
  // defaults change (e.g. the user saves new ones in cluster settings), while
  // not re-running on every render or clobbering in-session filter changes
  // made via handleNamespacesChange in between saves.
  const [appliedDefaultKey, setAppliedDefaultKey] = useState<string | null>(null);

  // Settings-persisted default namespaces are the source of truth for the
  // filter, applied on load and re-applied whenever they're saved again. In
  // between saves, in-session filter changes are kept in memory only (notxw
  // persisted) — reloading or restarting the app always rolls back to the
  // latest saved default. Defaults naming a namespace that no longer exists on
  // the cluster are dropped.
  if (defaultNamespaces && namespaceNames.length > 0) {
    const defaultKey = `${activeContext}:${JSON.stringify(defaultNamespaces)}`;
    if (appliedDefaultKey !== defaultKey) {
      setAppliedDefaultKey(defaultKey);
      const existing = new Set(namespaceNames);
      const filteredDefaults = defaultNamespaces.filter((ns) => existing.has(ns));
      setNamespaces(filteredDefaults);
      setActiveNamespaces(filteredDefaults);
    }
  }

  // Union with the persisted defaults so a namespace typed manually in cluster
  // settings (e.g. because the cluster can't be listed due to RBAC) shows up as
  // a selectable filter option immediately, without switching clusters to
  // remount and re-fetch.
  const sortedNamespaceNames = useMemo(
    () => Array.from(new Set([...namespaceNames, ...(defaultNamespaces ?? [])])).sort(),
    [namespaceNames, defaultNamespaces]
  );

  // Nav data comes from usePluginNavEntries reading pluginNavRegistry, which
  // each plugin populates by calling clusterWideAPI.registerNavEntry() at
  // module scope (mirrors clusterWideAPI.registerViews — see
  // PluginResourceView) — the plugin pushes its own nav entry rather than the
  // host reading a static export or importing any plugin-specific nav
  // contract. Unregistration is host-driven (below), not tied to a
  // component's mount lifecycle.
  const pluginNavData = usePluginNavEntries();
  // Plugin groups registered with defaultOpen expand the first time they're
  // seen (e.g. right after install). Tracked separately from openGroups so a
  // user collapsing the group afterwards isn't overridden on re-registration.
  const seededDefaultOpenGroups = useRef(new Set<string>());
  const pluginNavEntries = pluginNavData.navEntries;
  useEffect(() => {
    const toSeed = pluginNavEntries.reduce<string[]>((acc, entry) => {
      if (
        entry.kind === "group" &&
        entry.group.defaultOpen &&
        !seededDefaultOpenGroups.current.has(entry.group.id)
      ) {
        acc.push(entry.group.id);
      }
      return acc;
    }, []);
    if (toSeed.length === 0) return;
    for (const id of toSeed) seededDefaultOpenGroups.current.add(id);
    setOpenGroups((prev) => new Set([...prev, ...toSeed]));
  }, [pluginNavEntries]);
  const { pluginStatuses } = useGetInstalledPlugins();
  const mountedPlugins = useMemo(
    () => pluginStatuses.filter((s) => isPluginMounted(s.status)),
    [pluginStatuses]
  );
  // Reconcile against the actual registered plugin IDs (not a locally tracked
  // "previously mounted" baseline) — MainLayout unmounts/remounts on every
  // cluster switch and whenever the user navigates to Marketplace/Settings
  // (see App.tsx's AppContent), so a disable/remove that happens while this
  // component is unmounted would never be diffed against a prior local state.
  // The registries themselves are module-level singletons that outlive this
  // component's mount lifecycle, so they're the source of truth to reconcile
  // against.
  useEffect(() => {
    const currentIds = new Set(mountedPlugins.map((p) => p.pluginId));
    const registeredIds = new Set([
      ...pluginViewRegistry.getRegisteredPluginIds(),
      ...pluginNavRegistry.getRegisteredPluginIds(),
      ...pluginTrayRegistry.getRegisteredPluginIds(),
      ...pluginEventRegistry.getRegisteredPluginIds(),
    ]);
    for (const id of registeredIds) {
      if (!currentIds.has(id)) {
        pluginViewRegistry.unregisterView(id);
        pluginNavRegistry.unregisterNavEntry(id);
        pluginTrayRegistry.unregisterTrayFamilies(id);
        pluginEventRegistry.unregisterEvents(id);
      }
    }
  }, [mountedPlugins]);

  // Reset activeResource to overview if the currently-active resource belongs
  // to a plugin that is no longer mounted (e.g., disabled or crashed).
  // We intentionally call setState here to sync the UI when a plugin becomes unavailable;
  // this is the correct behavior to prevent showing a blank screen.
  useEffect(() => {
    const currentMountedIds = new Set(mountedPlugins.map((p) => p.pluginId));
    if (
      shouldResetActiveResource(activeResource, currentMountedIds, pluginNavData.viewTypeToPluginId)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveResource("overview");
    }
  }, [mountedPlugins, pluginNavData.viewTypeToPluginId, activeResource]);

  // Tray families come from usePluginTrayFamilies reading pluginTrayRegistry,
  // which each plugin populates by calling clusterWideAPI.registerTrayFamilies()
  // at module scope (mirrors registerViews/registerNavEntry above) — the
  // plugin pushes its own tray-family components rather than the host reading
  // a static export. Unregistration is host-driven (above), not tied to a
  // component's mount lifecycle.
  const pluginTrayFamilies = usePluginTrayFamilies();
  const mergedResourceLabels = useMemo(
    () => ({ ...RESOURCE_LABEL, ...pluginNavData.resourceLabels }),
    [pluginNavData.resourceLabels]
  );
  const mergedTrayRegistry = useMemo(
    () => ({ ...unifiedTrayRegistry, ...pluginTrayFamilies }),
    [pluginTrayFamilies]
  );

  const { forbiddenResources } = useCatchForbiddenResource(activeResource, {
    labelMap: mergedResourceLabels,
    activeContext,
    namespaces,
  });

  const handleNamespacesChange = useCallback(
    (ns: string[]) => {
      setNamespaces(ns);
      setActiveNamespaces(ns);
    },
    [setActiveNamespaces]
  );

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectItem = useCallback(
    (item: NavItem<ViewType>) => {
      if (item.view) {
        setActiveResource(item.view);
        const forbiddenNamespaces = forbiddenResources.get(item.view);
        if (forbiddenNamespaces) {
          const label =
            mergedResourceLabels[item.view as keyof typeof mergedResourceLabels] ?? item.view;
          renderErrorToast({
            title: `Access denied: cannot list ${label}${formatForbiddenNamespaces(forbiddenNamespaces)}`,
          });
        }
      }
    },
    [forbiddenResources, mergedResourceLabels]
  );

  return (
    <MainLayoutProvider
      activeContext={activeContext}
      activeResource={activeResource}
      namespaces={namespaces}
      onNamespacesChange={handleNamespacesChange}
      onNavigateToView={setActiveResource}
      className="relative flex h-full min-w-0 flex-1 overflow-hidden"
      containerRef={trayContainerRef}
    >
      <PluginDisabledSubscriber />

      {/* Sidebar */}
      <NavSidebar
        activeResource={activeResource}
        openGroups={openGroups}
        onToggleGroup={toggleGroup}
        onSelectItem={handleSelectItem}
        pluginNavEntries={pluginNavData.navEntries}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
          <span className="text-h1 font-medium">{activeContext}</span>
          <NamespaceMultiSelect
            namespaces={namespaces}
            availableNamespaces={sortedNamespaceNames}
            onNamespacesChange={handleNamespacesChange}
          />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4">
          <ErrorBoundary>
            <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
              <ActiveResourceView
                activeResource={activeResource}
                activeContext={activeContext}
                onNavigateToView={setActiveResource}
              />

              {/* Every READY or INSTALLING plugin stays mounted (hidden when inactive)
                  so a READY plugin's own PluginView can register its nav entry
                  before the user has navigated to it — see PluginResourceView.
                  Disabled, crashed, and incompatible plugins are excluded. */}
              {mountedPlugins.map((status) => (
                <PluginResourceView
                  key={status.pluginId}
                  pluginId={status.pluginId}
                  pluginName={status.name}
                  isActive={pluginNavData.viewTypeToPluginId[activeResource] === status.pluginId}
                  activeResource={activeResource}
                  onGoToMarketplace={onOpenMarketplace}
                />
              ))}
            </Suspense>

            <DetailBlock onNavigateToPortForwarding={() => setActiveResource("portforwarding")} />

            <UnifiedTrayOutlet registry={mergedTrayRegistry} containerRef={trayContainerRef} />
          </ErrorBoundary>
        </main>
      </div>
    </MainLayoutProvider>
  );
};
