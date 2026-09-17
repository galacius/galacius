---
name: unified-tray-architecture
description: How the built-in bottom tray families (modification, pod logs/exec) share one UnifiedTrayProvider/Shell via discriminated-union tab type + family registry; plugin-owned families (e.g. the former Helm "helm-chart" family, removed 2026-08-10) merge in at runtime instead of being statically registered
metadata:
  node_type: memory
  type: project
  originSessionId: 5a93f8be-580d-4db7-8b0a-372271194fa9
  modified: 2026-08-18T10:27:01.174Z
---

## Overview

Unified three separate bottom tray systems (Modification, Pod, Helm Chart) into ONE shared tray shell with a single tab bar, eliminating visual stacking. All three families rendered tabs together using a discriminated-union tab type system + registry pattern.

**2026-08-10: the Helm plugin was removed entirely** (see `[[file_structure]]`), taking the `"helm-chart"`/`helm-chart-upgrade` families and `HelmChartVersionTrayFamily`/`HelmChartVersionUpgradeTrayFamily` with it. The built-in `unifiedTrayRegistry` now only registers `modification` and `pod` (`frontend/src/app/clusters/shared/components/trays/unified/unifiedTrayRegistry.tsx`). Everything below describing the Helm family is historical — it documents how the pattern was designed/proven out, not current code. Plugin-owned families are (and, since the runtime-plugin architecture landed, always were meant to be) discovered generically at runtime via `usePluginTrayRegistry.ts`, not statically imported into this registry.

## Architecture

### Files Created

- `frontend/src/design-system/components/tray/unified/UnifiedTrayTypes.ts` — Discriminated union `UnifiedTrayTab` across families + `UnifiedTrayContentProps` interface
- `frontend/src/design-system/components/tray/unified/UnifiedTrayContext.tsx` — Provider/hook; reducer handles open_tab/set_active/close_tab/close_all + collapse/expand state; dedup logic per family (modification: kind+name+namespace; pod: contextName+ns+pod+mode; helm-chart: repo+chartName)
- `frontend/src/design-system/components/tray/unified/UnifiedTrayShell.tsx` — Main shell rendering TrayTabBar + ModificationTrayToolbar (when active tab is modification) + tabbed content dispatcher
- `frontend/src/design-system/components/tray/unified/unifiedTrayRegistry.tsx` — Maps family → content component (ModificationTrayFamily | PodTrayFamily | HelmChartVersionTrayFamily)
- `frontend/src/design-system/components/tray/unified/families/ModificationTrayFamily.tsx` — Adapter: dispatches to MODIFICATION_TRAY_CONTENT_REGISTRY[tab.kind]
- `frontend/src/design-system/components/tray/unified/families/PodTrayFamily.tsx` — Thin adapter (same pattern as `ModificationTrayFamily`/`HelmChartVersionTrayFamily`): imports `PodTray` (the mode-dispatch wrapper, see below) directly from `frontend/src/views/pods/PodTray.tsx` and renders `<PodTray tab={tab} collapsed={collapsed} />`.
- `frontend/src/design-system/components/tray/unified/families/HelmChartVersionTrayFamily.tsx` — Thin adapter (same pattern as `ModificationTrayFamily`): renders `HelmChartVersionTray` from `frontend/src/views/helm/HelmChartVersionTray.tsx`. The first implementation pass had fully reimplemented the toolbar/reducer/content in this file (~350 duplicated lines) instead of reusing the original — fixed by exporting the content component from the original file and importing it here.
- **2026-07-10 follow-up:** `frontend/src/views/helm/HelmChartVersionTray.tsx` originally exported TWO components — the old multi-tab shell `HelmChartVersionTray` (TrayTabBar + own collapsed/expanded reducer, now dead since `UnifiedTrayShell` owns tab management) and the content-only `HelmChartVersionTrayContent`. Since the shell was unused (only its own now-deleted test referenced it), it was deleted outright and `HelmChartVersionTrayContent` was renamed to `HelmChartVersionTray` — so the file now exports exactly one component, named after the file, matching the convention every other family's content component follows. `HelmChartVersionTrayProps` (formerly the deleted shell's tab-array props) was freed up and reused as the renamed content component's props type. The corresponding test file was rewritten to render the component directly with a single `tab` prop instead of a `tabs` array + tab-bar plumbing.
- **2026-07-10 follow-up (Pod):** applied the identical consolidation to `PodTray.tsx`. The old outer multi-tab shell `export const PodTray: FC<PodTrayProps>` (TrayTabBar + its own collapse/expand `trayReducer`) had zero remaining production callers (confirmed via grep — only its own test file referenced it) and was deleted, along with `PodTrayProps`, `TrayState`/`TrayAction`/`trayReducer`/`initialTrayState`, and now-unused imports (`TrayTabBar`, `TabsContent`, `ScrollText`, `Terminal`, `useMemo`). `PodLogTrayContent` and `PodExecTrayContent` (previously module-private) are now `export`ed directly from `PodTray.tsx`. `PodTrayFamily.tsx` no longer reimplements `logReducer`/`execReducer`/the content components/the toolbars from scratch — it now imports a single wrapper, `PodTray`, straight from `PodTray.tsx`. **2026-07-10 second follow-up:** the mode dispatch ternary (`tab.mode === "logs" ? <PodLogTrayContent .../> : <PodExecTrayContent .../>`) was moved out of `PodTrayFamily.tsx` into `PodTray.tsx` itself, as `export const PodTray: FC<PodTrayProps>` (`PodTrayProps = { tab: TrayTab; collapsed: boolean }`) — mirroring how `HelmChartVersionTray.tsx` and `NamespaceModificationTray.tsx` each own their own single top-level exported component named after the file. `PodTrayFamily.tsx` now just renders `<PodTray tab={tab} collapsed={collapsed} />`, keeping all pod-mode dispatch logic colocated with the content components it dispatches between. `frontend/src/design-system/components/tray/unified/families/PodTrayInternalComponents.tsx` (the old `PodMetaStrip`/`PodLogTrayToolbar`/`PodExecTrayToolbar`/`TrayBottomBar` duplicates) was deleted entirely — those components now live only in `PodTray.tsx` and are used internally by its own exported content components. `TrayTab` interface stays exported from `PodTray.tsx` (still referenced by `UnifiedTrayTypes.ts`'s type-only import and by the content components' own prop types). The test file `frontend/src/views/pods/__tests__/PodTray.test.tsx` was rewritten to render `PodLogTrayContent`/`PodExecTrayContent` directly with a single `tab`/`collapsed` prop pair instead of the old shell's `tabs` array + `activeTabId`/`onTabSelect`/`onCloseTab`/`onCloseAll` props — dropped the shell-only describe blocks ("portal", "tab bar", "tab close", "collapse/expand") since that behavior is now owned by `UnifiedTrayShell`/`TrayTabBar` and tested elsewhere.

### Files Modified

- `frontend/src/views/MainLayout.tsx` — Replaced ModificationTrayProvider/ModificationTrayOutlet with UnifiedTrayProvider/UnifiedTrayOutlet
- `frontend/src/views/namespaces/NamespacesView.tsx` — Changed useModificationTray → useUnifiedTray; updated openTab("Namespace", name) → openTab("modification", { kind: "Namespace", name })
- `frontend/src/views/namespaces/NamespaceDetailDrawer.tsx` — Same as above
- `frontend/src/views/pods/PodDetailDrawer.tsx` — Removed inline PodTray mount + local trayTabs/activeTabId state; replaced toggleTray() to call useUnifiedTray().openTab("pod", {...}); PodDrawerCtaButtons now checks unified tray tabs to mark logs/exec buttons active
- `frontend/src/views/pods/PodsView.tsx` — Same migration as PodDetailDrawer (list view's row-level Logs/Exec dropdown items); this file was initially missed by the first implementation pass and fixed as a follow-up — always grep for BOTH mount points (list view + detail drawer) when migrating a resource's tray trigger, per the established pattern in [[modification_tray_architecture]]
- `frontend/src/views/helm/HelmChartDetailDrawer.tsx` — Removed inline HelmChartVersionTray mount + showInstallTray state; Install button now calls useUnifiedTray().openTab("helm-chart", {...})

### NOT Deleted

- `ModificationTrayTypes.ts`, `ModificationTrayToolbar.tsx`, `modificationTrayRegistry.tsx` remain (referenced by `ModificationTrayFamily` adapter — `MODIFICATION_TRAY_CONTENT_REGISTRY` is genuinely reused, not duplicated)
- `PodTray.tsx` remains, but now only as a content-component module: exports `TrayTab`, `PodLogTrayContent`, `PodExecTrayContent`, and the mode-dispatch wrapper `PodTray` (reused directly by `PodTrayFamily`). The outer multi-tab shell component (previously also named `PodTray`) was deleted — see 2026-07-10 follow-up above.
- `HelmChartVersionTray.tsx` remains, but now only as a content-component module (its old multi-tab shell was deleted and the content component renamed to take over the file's name — see 2026-07-10 follow-up above).

### Deleted (2026-07-10, third follow-up)

- `frontend/src/design-system/components/tray/modification/ModificationTray.tsx` — the old multi-tab shell (`TrayTabBar` + its own collapse/expand `trayReducer`, dispatching per-tab via `MODIFICATION_TRAY_CONTENT_REGISTRY`), same dead pattern as the old `PodTray`/`HelmChartVersionTray` shells. Confirmed via grep to have zero remaining callers — its only consumer was `ModificationTrayContext.tsx` (also dead, see below). Had no test file.
- `frontend/src/design-system/components/tray/modification/ModificationTrayContext.tsx` — the pre-unification `ModificationTrayProvider`/`useModificationTray`/`ModificationTrayOutlet`, fully superseded by `UnifiedTrayProvider`/`useUnifiedTray`/`UnifiedTrayOutlet` since the original unification pass (`MainLayout.tsx` already only wires the unified provider — see "Files Modified"). Confirmed via grep: zero references anywhere in `src` outside its own file. Had no test file.
- Net effect: `frontend/src/design-system/components/tray/modification/` was left with only the three still-genuinely-used files (`ModificationTrayTypes.ts`, `ModificationTrayToolbar.tsx`, `modificationTrayRegistry.tsx`) — no more dead shell/context pair, matching the Pod/Helm cleanups. **2026-07-13:** that trio was moved out of `design-system` entirely, to `frontend/src/app/clusters/shared/trays/modification/` — see [[modification_tray_architecture]] for why and the import-path fallout.

### Moved 2026-07-13: `families/` out of design-system

`frontend/src/design-system/components/tray/unified/families/` (the three adapter files: `ModificationTrayFamily.tsx`, `PodTrayFamily.tsx`, `HelmChartVersionTrayFamily.tsx`) moved to `frontend/src/app/clusters/shared/trays/unified/families/` — same rationale as the modification-tray move above: each adapter's real work is importing app-layer content (`PodTray` from `app/clusters/modules/pods/`, `HelmChartVersionTray` from `app/plugins/helm/components/`, the modification registry from `app/clusters/shared/trays/modification/`), which `design-system` shouldn't own. Inside the moved family files, imports flipped both ways per [[feedback_no_self_alias_imports]]: their app-layer targets (`PodTray`, `HelmChartVersionTray`, `modificationTrayRegistry`) went from `@/app/...` alias to relative paths (now same top-level dir); their `UnifiedTrayTypes` import went from relative (`../UnifiedTrayTypes`) to the `@/design-system/components/tray/unified/UnifiedTrayTypes` alias (now cross-top-level, since `UnifiedTrayTypes.ts` itself stayed in `design-system`).

### Moved 2026-07-13 (follow-up): `unifiedTrayRegistry.tsx` out of design-system

`frontend/src/design-system/components/tray/unified/unifiedTrayRegistry.tsx` moved to `frontend/src/app/clusters/shared/trays/unified/unifiedTrayRegistry.tsx` — it now sits next to the `families/` it registers (moved just above), so its three `ModificationTrayFamily`/`PodTrayFamily`/`HelmChartVersionTrayFamily` imports flipped from the `@/app/clusters/shared/trays/unified/families/...` alias to relative `./families/...` (same top-level dir, [[feedback_no_self_alias_imports]]), and its `UnifiedTrayTypes` import flipped from relative `./UnifiedTrayTypes` to the `@/design-system/components/tray/unified/UnifiedTrayTypes` alias (now cross-top-level, since `UnifiedTrayTypes.ts` stayed in `design-system`).

**2026-07-13 (second follow-up): registry now injected via props, not imported by `design-system`.** Rather than have `UnifiedTrayShell.tsx` import `unifiedTrayRegistry` directly from `@/app/...` (which would've been the one remaining `design-system`→`app` reach), it now takes the registry as a prop: `UnifiedTrayShell` gained `UnifiedTrayShellProps { registry: Record<TrayContentFamily, UnifiedTrayContentComponent> }` and looks up content via `registry[tab.family]` instead of a module-level import. `UnifiedTrayOutlet` (in `UnifiedTrayContext.tsx`) forwards the same prop straight through to `UnifiedTrayShell`. The registry is instantiated once at the app layer — `frontend/src/app/clusters/MainLayout.tsx` imports `unifiedTrayRegistry` (relative `./shared/trays/unified/unifiedTrayRegistry`, same top-level dir) and passes it as `<UnifiedTrayOutlet registry={unifiedTrayRegistry} />`. Net effect: `design-system/components/tray/unified/**` has zero `@/app` imports — `design-system` no longer needs a sanctioned exception into `app` for the unified tray at all. If a new family/registry-consuming component is ever added inside `design-system`, prefer threading the registry down as a prop over importing it, following this pattern.

## Usage

### Opening a tab from anywhere with useUnifiedTray()

```typescript
const { openTab } = useUnifiedTray()

// Modification: edit a Namespace YAML
openTab("modification", { kind: "Namespace", name })

// Pod: open logs or exec
openTab("pod", { contextName, ns, pod, containers, mode: "logs" | "exec", ownerKind?, ownerName? })

// Helm Chart: install a chart
openTab("helm-chart", { repo, chartName, initialVersion })
```

### Tab Deduplication

- **Modification:** If a tab with same kind+name+namespace already exists, just activate it
- **Pod:** If a tab with same contextName+ns+pod+mode already exists, just activate it
- **Helm Chart:** If a tab with same repo+chartName already exists, just activate it

## Design Patterns

### Discriminated Union Tab Type

```typescript
type UnifiedTrayTab =
  | { family: "modification"; id: string; kind: string; name: string; namespace?: string }
  | {
      family: "pod";
      id: string;
      contextName: string;
      ns: string;
      pod: string;
      containers: PodContainerDetail[];
      mode: "logs" | "exec";
      ownerKind?: string;
      ownerName?: string;
    }
  | { family: "helm-chart"; id: string; repo: string; chartName: string; initialVersion: string };
```

### Family Adapter Pattern

Each family has an adapter (`ModificationTrayFamily`, `PodTrayFamily`, `HelmChartVersionTrayFamily`) that:

1. Accepts `UnifiedTrayContentProps { tab: UnifiedTrayTab; collapsed: boolean; onClose: () => void }`
2. Type-checks the tab (returns null if not the expected family)
3. Dispatches to the appropriate inner renderer (either a registry like ModificationTray does, or direct render like Pod/Helm do)

### Toolbar Rendering

- Each family's content component owns and renders its own toolbar internally (e.g. `NamespaceModificationTray.tsx` renders `ModificationTrayToolbar` itself, fully wired to real `isLoading`/`isDirty`/`onSave` state)
- `UnifiedTrayShell.tsx` does NOT render any toolbar of its own — it only renders `TrayTabBar` + per-tab `Content` from the registry
- **Bug fixed 2026-07-10:** the first implementation pass had `UnifiedTrayShell.tsx` ALSO render a second, stub `ModificationTrayToolbar` for the active modification tab (hard-coded `isLoading={false}`, `onSave={() => {}}`), duplicating the real toolbar already rendered inside `NamespaceModificationTray.tsx` — visible as two identical Kind/Name/Namespace/Cancel/Save rows stacked in the tray. Removed the shell-level toolbar block (and the now-unused `activeTab` var + `ModificationTrayToolbar` import) entirely; the family content component is the single source of truth for its own toolbar.

## Known Limitations

- Icon rendering is done inline in UnifiedTrayShell (not delegated to utils, to avoid JSX in non-TSX files)
- ModificationTrayToolbar in shell is currently hard-coded for kind==="Namespace"; future resource kinds will need toolbar variants
- Tab matching deduplication is done manually per-family in trayReducer; consider factoring into a family-specific key function if more families are added

### Pod family typing convention

`PodTrayFamily.tsx` and `PodTrayInternalComponents.tsx` both derive the pod tab shape via:

```typescript
type PodTab = Extract<UnifiedTrayTab, { family: "pod" }>;
```

Do NOT redeclare a local `interface PodTab { ... }` in either file — the first implementation pass did this independently in both files (one with `containers: any[]`), which both violated lint (`no-explicit-any`, `no-unused-vars` on an `onClose` destructure with a misplaced disable-comment) and caused a type mismatch once one file was fixed but not the other (tsc: "missing family, id"). If a new field is ever needed on pod tabs, add it to the `UnifiedTrayTab` union in `UnifiedTrayTypes.ts` — both files pick it up automatically via `Extract`.

## Testing Coverage

- `PodDrawerBody.tray.test.tsx` was fully rewritten (not just wrapper-patched) — it used to mock `../PodTray` directly and assert toggle-off behavior; that model doesn't apply anymore since tab state now lives in `UnifiedTrayContext` and duplicate `openTab` calls activate rather than remove a tab. It now mocks `useUnifiedTray` directly and asserts `openTab` call args + active-state styling from a seeded `tabs` array.
- `HelmChartDetailDrawer.test.tsx` only needed its render wrapper updated to include `UnifiedTrayProvider` alongside `QueryClientProvider`.
- Any other test that renders a component calling `useUnifiedTray()` needs `UnifiedTrayProvider` in its wrapper or a mock of `@/components/tray/unified/UnifiedTrayContext` — forgetting this throws `"useUnifiedTray must be used within a UnifiedTrayProvider"`.

Run before committing:

```bash
pnpm exec tsc --noEmit -p frontend  # TypeScript
pnpm lint:fe                         # ESLint
pnpm run format                      # Prettier
npx vitest run                       # full suite
```

Final verification (2026-07-10, after fixing the gaps above): tsc clean, lint clean (0 errors), full `vitest run` = 613 passed / 3 failed (pre-existing, unrelated — `LimitRangesView.edge.test.tsx` / `ResourceQuotasView.edge.test.tsx`, confirmed untouched via `git status`). Scoped `vitest run src/views/pods src/views/helm src/views/namespaces` = 69/69 passed.

### Gap in the first implementation pass

The developer agent's own summary claimed `PodsView.tsx` was migrated, but it wasn't — `grep -n "PodTray" frontend/src/views/pods/PodsView.tsx` still showed the old import + JSX after the agent reported done. Always verify a subagent's "Files Modified" list against `git status --short` and a targeted grep for the old API before trusting it, especially for haiku-model developer phases in the feature-dev pipeline.

### Superseded 2026-07-13: `design-system` extracted to `design-system`, remaining tray files relocated

`frontend/src/design-system` no longer exists — it was extracted into the standalone, publishable `design-system` (`@galacius/design-system`, see [[features_design_system_package]]). The last files still under `design-system/components/tray/unified/` at that point (`UnifiedTrayTypes.ts`, `UnifiedTrayContext.tsx`, `UnifiedTrayShell.tsx`, `unifiedTrayRegistry.tsx`, `TrayTabBar.tsx`) could NOT move into the new package (they depend on frontend-app-specific types) and instead moved to `frontend/src/app/clusters/shared/trays/` (with `unified/` and `families/` subfolders) — same final destination the `families/`/`unifiedTrayRegistry.tsx` moves above were already headed toward, now joined by the remaining core files. All `frontend/src/design-system/...` paths in this document above are historical (accurate as of their dated entry, not current file locations).

### Gotcha (2026-07-15): tray content renders OUTSIDE per-plugin React contexts

`UnifiedTrayOutlet` is mounted once at the top level in `MainLayout.tsx`, wrapped only by `MainLayoutProvider`/`UnifiedTrayProvider`. It is a sibling of, not a descendant of, `HelmProvider` (which only wraps `HelmChartsView`/`HelmReleasesView` inside `HelmView.tsx`). Any family content component that calls a plugin-scoped context hook (e.g. `useHelmContext()`) will throw `"useXContext must be used inside XProvider"` at runtime, since the tray tree is outside that provider — this is easy to miss because it only surfaces when the tray tab is actually opened, not at compile time.

**Fix pattern:** thread whatever the tray content needs (e.g. `activeContext`, callback functions like `onNavigateToHelmReleases`) as fields on the `UnifiedTrayTab` discriminated-union variant itself (`UnifiedTrayTypes.ts`), populated at the `openTab(...)` call site — which IS inside the owning provider's tree and can safely call the plugin's context hook. The family content component (`HelmChartVersionTray.tsx`) then destructures these straight off its `tab` prop instead of calling the plugin context hook itself. Applied to the `helm-chart` tab family: added `activeContext`/`onNavigateToHelmReleases` to `UnifiedTrayTab`'s helm-chart variant + `HelmChartVersionTrayTab`, populated in `HelmChartDetailDrawer.tsx`'s `openTab("helm-chart", {...})` call (which already had `useHelmContext()` available), consumed in `HelmChartVersionTray.tsx` via `tab.activeContext`/`tab.onNavigateToHelmReleases` — `useHelmContext` import removed from that file entirely.

**How to apply going forward:** any new unified-tray family whose content needs data from a plugin-scoped (non-MainLayout) context must follow this same "thread it through the tab payload at open-time" pattern — never call the plugin's context hook directly inside a family content component.
