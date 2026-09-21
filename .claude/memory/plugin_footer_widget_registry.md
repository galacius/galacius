---
name: plugin-footer-widget-registry
description: App-wide footer widget registry (`appWideAPI.registerFooterWidget`, mirroring `registerSettingsTab`) letting a plugin show live host-wide data before a cluster connects, plus the app-root `PluginEventListener` vs. cluster-scoped `PluginDisabledSubscriber` event-dispatch split (motivating case: the resources-monitor plugin, galacius-plugins repo)
metadata:
  node_type: memory
  type: project
---

## Problem

Most plugin surfaces (views, tray families, settings tabs) only render once a cluster is connected.
The `resources-monitor` plugin needs to show live host-wide data (e.g. CPU/memory) in the app's footer
even before any cluster connection exists, so it needed both an app-wide UI extension point and an
event-dispatch path that's live pre-cluster-connection.

## Footer widget registry

- **Type:** `PluginFooterWidget` (`packages/core/frontend/src/types/footer.ts`) — `{ id: string;
  component: ComponentType }`.
- **Registration API:** `appWideAPI.registerFooterWidget(pluginId, widget)`
  (`packages/core/frontend/src/api/appWideAPI.ts`), alongside `registerStylesheets`/
  `registerSettingsTab`/`getQueryClient`. Like the others, it's a stub in `@galacius/core` that throws
  if called outside a plugin bundle loaded by the host — the host replaces it at runtime via injection
  (`frontend/src/expose/index.tsx`).
- **Registry:** `pluginFooterRegistry` (`frontend/src/app/plugins/hooks/registry/footer/
  pluginFooterRegistry.ts`) — a module-singleton class (`Map<pluginId, PluginFooterWidget>`), mirroring
  `pluginSettingsRegistry.ts` field-for-field: `registerFooterWidget`/`unregisterFooterWidget`,
  `getFooterWidgets()`/`getFooterWidget(pluginId)`/`getRegisteredPluginIds()`,
  `subscribeFooterRegistry` (notify listeners), plus one addition settings doesn't have:
  `subscribeFooterWidgetUnregister`, used by the snapshot mechanism below to invalidate a stale
  snapshot when a plugin self-unregisters its widget at runtime.
- **Consumer hook:** `usePluginFooterWidgets()` (`.../footer/usePluginFooterWidgets.tsx`) —
  `useSyncExternalStore` over `pluginFooterRegistry`'s subscribe/getFooterWidgets, same pattern as the
  settings-tab equivalent.
- **Rendering:** `AppFooter.tsx` (`frontend/src/app/footer/AppFooter.tsx`) calls
  `usePluginFooterWidgets()` and renders each `{ pluginId, widget }` pair wrapped in its own
  `PluginErrorBoundary` + `Suspense`, keyed by `pluginId` — one crashing/suspending widget can't take
  down another plugin's or the host's own footer content (`ProxyServer`, `Updater`).

## Reconciliation and the ES-module-cache snapshot

`PluginRegistryReconciler.tsx` (`frontend/src/app/plugins/PluginRegistryReconciler.tsx`, mounted once
at the app root, pre-cluster) loads every ready-installed plugin's bundle via `loadPluginModule` and,
on disable/uninstall (a plugin ID present in the registries but no longer in `readyPlugins`), calls
`unregisterStylesheets`/`unregisterSettingsTab`/`unregisterFooterWidget` for that ID — these app-wide
registries have no reach from cluster-scoped code (`MainLayout`), so this reconciler is solely
responsible for cleaning them up.

The tricky part is **re-enabling** a plugin: the browser's ES module loader caches an evaluated module
by URL for the page's lifetime, so re-`import()`ing the same bundle URL (same pluginId +
bundleChecksum, e.g. after a disable/re-enable cycle) resolves instantly from cache *without*
re-running the module's top-level `register*` calls — which would otherwise leave the plugin's
stylesheets, settings tab, and footer widget missing until a full page reload resets the module cache.
`pluginAppWideAssetSnapshot.ts` (`frontend/src/app/plugins/pluginAppWideAssetSnapshot.ts`) works around
this: `captureAppWidePluginSnapshot(pluginId, bundleChecksum)` snapshots whatever a fresh import just
populated into the three app-wide registries, keyed by pluginId + bundleChecksum; on a later load of
the same plugin, `restoreAppWidePluginSnapshot` re-populates the registries from the snapshot instead
of relying on the module re-evaluating, returning `true` if it restored one (the reconciler only
captures a fresh snapshot when restore returns `false`). The module also subscribes to
`pluginFooterRegistry`'s `subscribeFooterWidgetUnregister` to clear a stale `footerWidget` off an
existing snapshot if the plugin self-unregisters at runtime, so a later restore can't resurrect it.

## Event-listener split and the liveness guard

Plugin-event dispatch (Wails' `plugin:event` IPC event, routed to per-plugin handlers registered via
`clusterWideAPI.registerEvents(pluginId, handlers)`) used to only work once a cluster was connected.
Since an app-wide surface like the footer widget needs live events pre-cluster-connection too, the
listener is now split by mount point rather than scope of the event data itself:

- **`PluginEventListener`** (`frontend/src/app/plugins/PluginEventListener.tsx`) — mounted at the app
  root beside `PluginRegistryReconciler` in `App.tsx`, so it's live before any cluster connects. It
  calls `usePluginEventListener()` (`frontend/src/app/plugins/hooks/registry/event/
  usePluginEventListener.ts`), which subscribes to `EventsOn("plugin:event", ...)` and, for each
  incoming `{ pluginId, eventName, payload }`, checks the event's `pluginId` against a live ref of
  `readyPlugins` (from `useGetInstalledPlugins`) before looking up a handler — a disabled/crashed
  plugin stays in the installed list, so filtering by ready status (not just installed) is what
  actually stops dispatch to it.
- **`PluginDisabledSubscriber`** (`frontend/src/app/clusters/plugins/PluginDisabledSubscriber.tsx`,
  renamed from `PluginEventsSubscriber`) — mounted inside `MainLayout` (cluster-scoped, needs
  `UnifiedTrayProvider` in its ancestor tree). It calls `usePluginDisabledEventSubscription()`, which
  subscribes to a *different* Wails event, `plugin:disabled`, and closes any open unified-tray tabs
  owned by that plugin (`tab.origin === "plugin" && tab.pluginId === pluginId`). It does not dispatch
  `plugin:event` payloads itself.
- **The shared registry:** both the write path (`clusterWideAPI.registerEvents`, wired in
  `frontend/src/expose/index.tsx` straight to `pluginEventRegistry.registerEvents`) and the app-root
  listener's read path use the same singleton, `pluginEventRegistry`
  (`frontend/src/app/clusters/plugins/hooks/registry/event/pluginEventRegistry.ts`) — it stayed at its
  original cluster-scoped path even though it's now also read from the app-root listener.
  `getHandlerFor(pluginId, eventName)` is the dispatch-time liveness guard: it only returns a handler
  if the registered entry's `pluginId` still matches, so even if the app-root listener's own
  `readyPlugins` ref were momentarily stale, a handler orphaned by `unregisterEvents(pluginId)` (called
  from `MainLayout`'s own reconciliation) can't fire.

A plugin frontend calling `clusterWideAPI.registerEvents(pluginId, handlers)` (e.g.
`resources-monitor`'s `frontend/src/index.ts`, in the `galacius-plugins` repo) doesn't need to know or
care which listener dispatches to it — this split is host-internal plumbing.
