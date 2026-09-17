---
name: modification-tray-architecture
description: "Generic cross-resource ModificationTray system (bottom tray, multi-tab) — how to add a new resource kind"
metadata:
  node_type: memory
  type: project
  originSessionId: 5a93f8be-580d-4db7-8b0a-372271194fa9
---

Generalized (2026-07-10) the Namespace-only whole-YAML-edit bottom tray (see [[features_namespace_yaml_edit]] for its origin/history) into a resource-agnostic system so any resource kind can get a modification tray with minimal new code.

**Moved 2026-07-13:** the shared/generic pieces (`ModificationTrayTypes.ts`, `ModificationTrayToolbar.tsx`, `modificationTrayRegistry.tsx`) moved from `frontend/src/design-system/components/tray/modification/` to `frontend/src/app/clusters/shared/trays/modification/` — out of `design-system` (generic UI kit) into `app` (feature code), since `modificationTrayRegistry.tsx` imports every resource's own `<Resource>ModificationTray.tsx` from `app/clusters/modules/**`, which is an app-layer dependency, not something `design-system` should own. `design-system/components/tray/unified/families/ModificationTrayFamily.tsx` (which stays in `design-system`) now imports the registry cross-top-level via `@/app/clusters/shared/trays/modification/modificationTrayRegistry` — this is the one place `design-system` is allowed to reach into `app`, an existing pre-move exception, not a new violation. Per [[feedback_no_self_alias_imports]], since the registry now lives under `app/`, its imports of `app/clusters/modules/**` were rewritten from the `@/app/...` alias to relative (`../../../modules/...`), and the 31 `app/clusters/modules/**/*ModificationTray.tsx` files' imports of `ModificationTrayTypes`/`ModificationTrayToolbar` were rewritten from `@/design-system/...` to relative (`../../shared/trays/modification/...`) for the same reason. `ModificationTrayToolbar.tsx`'s own imports of `Button`/`cn` flipped the other way — from relative (`../../../atoms/button`) to the `@/design-system/...` alias, since the file left `design-system` and those targets are now cross-top-level.

**Superseded 2026-07-13:** `design-system` was extracted into the standalone `design-system` package (`@galacius/design-system`, see [[features_design_system_package]]). The `@/design-system/...` alias referenced above no longer exists — any remaining `design-system`-owned imports (e.g. `Button`, `cn`) in these files now use `@galacius/design-system/atoms`, `@galacius/design-system/utils`, etc. `ModificationTrayFamily.tsx` also relocated (see [[unified_tray_architecture]]) to `frontend/src/app/clusters/shared/trays/unified/families/`.

## Files

All under `frontend/src/app/clusters/shared/trays/modification/` unless noted:

- `ModificationTrayTypes.ts` — `ModificationResourceKind` union, `ModificationTrayTab` (`id`, `kind`, `name`, optional `namespace` for namespaced resources), `ModificationTrayContentProps`/`ModificationTrayContentComponent`.
- `ModificationTrayToolbar.tsx` — shared toolbar row (Kind/Name/Namespace chips + Cancel/Save/Save & Close buttons), reused by every kind's content component.
- `modificationTrayRegistry.tsx` — `Record<ModificationResourceKind, ModificationTrayContentComponent>` mapping kind → its content component. **This is the extension point.**
- `frontend/src/app/clusters/modules/<resource>/<Resource>ModificationTray.tsx` (e.g. `namespaces/NamespaceModificationTray.tsx`) — each resource's own content (data fetch/edit/save hooks), implementing `ModificationTrayContentProps`. `NamespaceModificationTray.tsx` is the template to copy for a new resource kind.
- `ModificationTray.tsx`/`ModificationTrayContext.tsx` (the old multi-tab shell + standalone provider) were deleted 2026-07-10 as dead code once `UnifiedTrayProvider`/`UnifiedTrayShell` took over — see [[unified_tray_architecture]]. Do not recreate them; use `useUnifiedTray()` instead.

## Mount point

Tray tabs are opened via `useUnifiedTray().openTab("modification", { kind, name, namespace? })` from anywhere (list row dropdown, detail drawer button) — see [[unified_tray_architecture]] for the full unified-tray API. `UnifiedTrayProvider`/`UnifiedTrayOutlet` are mounted once in `MainLayout.tsx`, not per-view.

## How to add a new resource kind's modification tray

1. Add the kind string to `ModificationResourceKind` in `frontend/src/app/clusters/shared/trays/modification/ModificationTrayTypes.ts`.
2. Create `frontend/src/app/clusters/modules/<resource>/<Resource>ModificationTray.tsx` implementing `ModificationTrayContentProps` (mirror `NamespaceModificationTray.tsx`) — typically: a data-access hook to fetch YAML/data, a data-mutation hook to save, `ModificationTrayToolbar` for chrome, whatever editor UI (usually `Textarea variant="yaml"`). Import shared tray pieces via relative paths (`../../shared/trays/modification/...`), not the `@/app/...` alias — see [[feedback_no_self_alias_imports]].
3. Register it in `frontend/src/app/clusters/shared/trays/modification/modificationTrayRegistry.tsx` (relative import into `../../../modules/<resource>/...`).
4. From any CTA, call `useUnifiedTray().openTab("modification", { kind: "<Kind>", name, namespace? })` (omit `namespace` for cluster-scoped resources).
5. No changes needed to `MainLayout.tsx` or the unified tray shell — the registry + Provider already at the top handle it.

## Verification

`tsc --noEmit` clean; `pnpm lint` 0 errors (pre-existing warnings only); `pnpm format` clean.
