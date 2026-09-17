---
name: detail-drawer-pattern
description: How to open/close resource detail drawers from anywhere using DetailDrawerContext + DetailBlock; full steps for adding a new drawer end-to-end
metadata:
  node_type: memory
  type: project
  originSessionId: 4be037ac-a1de-4374-93eb-23601a390d9a
---

## Pattern: Global Detail Drawer via DetailDrawerContext

Detail drawers are triggered globally through `DetailDrawerContext` (now at `frontend/src/app/clusters/shared/components/details/DetailDrawerContext.tsx`, `useDetailDrawerContext()`) — not by passing props or lifting state into individual views. Views must NOT render their own `<XxxDetailDrawer>` instance — only `DetailBlock` does. `activeContext` still comes from the separate, trimmed `useMainLayoutContext()` (see [[detail_drawer_context_split]]).

**2026-09-12 rewrite — context-selector scoping:** `useDetailDrawerContext` now takes an optional selector, `useDetailDrawerContext((v) => ({ onTogglePodDetail: v.onTogglePodDetail }))`, backed by a closure-based external store + `useSyncExternalStoreWithSelector` instead of a plain `useReducer` + `useMemo([state])`. This fixed a re-render fan-out (toggling any one of the ~40 kinds' drawers previously re-rendered every consumer in the app, which under StrictMode's doubled dev-mode passes made rapid list↔drawer navigation feel like a hang). All ~70 call sites across the codebase now pass a selector; see `react_code_quality.md`'s "Context-selector scoping for large shared contexts" section for the implementation pattern and the `react-hooks/immutability`/`react-hooks/refs` lint constraints it had to satisfy. The context/reducer/action shape described below (fields, toggle signatures) is unchanged — only how consumers subscribe to it changed.

### Context shape (`frontend/src/views/DetailDrawerContext.tsx`, split out of MainLayoutContext on 2026-07-10)

Two signatures depending on whether the resource is cluster-scoped or namespace-scoped:

```tsx
// Cluster-scoped (name only)
onToggleNamespaceDetail: (name?: string) => void
onToggleClusterRoleDetail: (name?: string) => void

// Namespace-scoped (namespace + name)
onToggleRoleDetail: (namespace?: string, name?: string) => void
onToggleServiceAccountDetail: (namespace?: string, name?: string) => void
onTogglePodDetail: (namespace?: string, name?: string) => void
onToggleJobDetail: (namespace?: string, name?: string) => void
onToggleServiceDetail: (namespace?: string, name?: string) => void
```

Calling with args opens; calling with no args closes. The selected values drive both open state and which resource to show.

Full current state pairs in context (as of 2026-07-09):

Cluster-scoped (name only):

- `selectedNamespaceName / onToggleNamespaceDetail`
- `selectedClusterRoleName / onToggleClusterRoleDetail`
- `selectedClusterRoleBindingName / onToggleClusterRoleBindingDetail`
- `selectedNodeName / onToggleNodeDetail`

Namespace-scoped (namespace + name):

- `selectedRoleName + selectedRoleNamespace / onToggleRoleDetail`
- `selectedRoleBindingName + selectedRoleBindingNamespace / onToggleRoleBindingDetail`
- `selectedServiceAccountName + selectedServiceAccountNamespace / onToggleServiceAccountDetail`
- `selectedPodName + selectedPodNamespace / onTogglePodDetail`
- `selectedJobName + selectedJobNamespace / onToggleJobDetail`
- `selectedCronJobName + selectedCronJobNamespace / onToggleCronJobDetail`
- `selectedServiceName + selectedServiceNamespace / onToggleServiceDetail`
- `selectedDeploymentName + selectedDeploymentNamespace / onToggleDeploymentDetail`
- `selectedReplicaSetName + selectedReplicaSetNamespace / onToggleReplicaSetDetail`
- `selectedDaemonSetName + selectedDaemonSetNamespace / onToggleDaemonSetDetail`
- `selectedStatefulSetName + selectedStatefulSetNamespace / onToggleStatefulSetDetail`
- `selectedEventName + selectedEventNamespace / onToggleEventDetail`
- `selectedConfigMapName + selectedConfigMapNamespace / onToggleConfigMapDetail`
- `selectedNetworkPolicyName + selectedNetworkPolicyNamespace / onToggleNetworkPolicyDetail`
- `selectedPersistentVolumeClaimName + selectedPersistentVolumeClaimNamespace / onTogglePersistentVolumeClaimDetail`
- `selectedPodDisruptionBudgetName + selectedPodDisruptionBudgetNamespace / onTogglePodDisruptionBudgetDetail`
- `selectedSecretName + selectedSecretNamespace / onToggleSecretDetail`
- `selectedEndpointName + selectedEndpointNamespace / onToggleEndpointDetail`

Special (repo + name): historically the Helm plugin had its own `selectedHelmChartName`/`selectedHelmReleaseName` pair here, but that state had already moved out to the plugin's own `HelmContext.tsx` (a plugin-scoped context, not `DetailDrawerContext`) before the Helm plugin itself was removed entirely on 2026-08-10 — see `[[unified_tray_architecture]]`'s "Gotcha (2026-07-15)" entry for why plugin-scoped state can't live here.

### Where the drawer lives (`src/views/DetailBlock.tsx`)

`DetailBlock` is always mounted inside `MainLayoutProvider` (in `MainLayout`), so it's always in the DOM regardless of which view is active. This avoids the lazy-loading bug where a drawer inside a lazy view can't open from a different view.

All global drawers are rendered here. **Never render a detail drawer inside a view component** — it breaks cross-view opening.

**Drawers currently registered in `DetailBlock` (2026-07-09):**
`NamespaceDetailDrawer`, `ClusterRoleDetailDrawer`, `ClusterRoleBindingDetailDrawer`, `RoleDetailDrawer`, `RoleBindingDetailDrawer`, `ServiceAccountDetailDrawer`, `PodDetailDrawer`, `JobDetailDrawer`, `CronJobDetailDrawer`, `NodeDetailDrawer`, `ServiceDetailDrawer`, `DeploymentDetailDrawer`, `ReplicaSetDetailDrawer`, `DaemonSetDetailDrawer`, `StatefulSetDetailDrawer`, `EventDetailDrawer`, `ConfigMapDetailDrawer`, `NetworkPolicyDetailDrawer`, `PersistentVolumeClaimDetailDrawer`, `PodDisruptionBudgetDetailDrawer`, `SecretDetailDrawer`, `EndpointDetailDrawer`

### How to trigger from any view/component

```tsx
// Cluster-scoped
const { onToggleClusterRoleDetail } = useDetailDrawerContext();
onToggleClusterRoleDetail(name); // open
onToggleClusterRoleDetail(); // close

// Namespace-scoped
const { onToggleJobDetail } = useDetailDrawerContext();
onToggleJobDetail(namespace, name); // open
onToggleJobDetail(); // close
```

### Adding a new resource drawer (end-to-end steps)

1. **Go — `internal/kube/resources/<resource>.go`**: add `GetXxxByName(lister, namespace, name)` that calls `lister.Xxxs(namespace).Get(name)` (cluster-scoped: omit namespace, call `lister.List` then filter or `lister.Get`).

2. **Go — `internal/app/<resource>.go`**: add `func (a *App) GetXxxByName(namespace, name string)` following the guard pattern:

   ```go
   func (a *App) GetJobByName(namespace, name string) (dto.Job, error) {
     a.mu.RLock(); h := a.factories[a.activeContext]; a.mu.RUnlock()
     if h == nil { return dto.Job{}, nil }
     if h.IsForbidden("jobs") { return dto.Job{}, nil }
     result, err := resources.GetJobByName(h.Factory.Batch().V1().Jobs().Lister(), namespace, name)
     if err != nil { log.Printf("app: GetJobByName: %v", err); return dto.Job{}, nil }
     return result, nil
   }
   ```

   Swallow errors (return nil) — empty state handles the fallback on the frontend.

3. **`frontend/src/api/resources.ts`**: add `GetXxxByName` to the re-export list at the top. Also add Wails binding stubs manually if not running `wails dev`:
   - `frontend/wailsjs/go/app/App.js`
   - `frontend/wailsjs/go/app/App.d.ts`

4. **`frontend/src/api/api.const.ts`**: add `export const QUERY_KEY_XXX_DETAIL = "xxxDetail"`

5. **`frontend/src/hooks/useGetXxxDetail.ts`**: mirror `useGetPodDetail`:

   ```ts
   export const useGetXxxDetail = (
     context: string,
     namespace: string | null,
     name: string | null
   ) => {
     return useQuery<Xxx, Error>({
       queryKey: [QUERY_KEY_XXX_DETAIL, { context, namespace, name }],
       queryFn: () => GetXxxByName(namespace!, name!) as unknown as Promise<Xxx>,
       ...DEFAULT_QUERY_OPTIONS,
       enabled: !!context && !!namespace && !!name,
     });
   };
   ```

   Cluster-scoped resources omit `namespace` from the hook signature and query key.

6. **`XxxDetailDrawer.tsx`**: accept `xxxName: string | null` + `xxxNamespace: string | null` (namespace-scoped) or just `xxxName: string | null` (cluster-scoped). **Do NOT accept `context` as a prop** — call `const { activeContext } = useMainLayoutContext()` inside the outer drawer component (and any sub-components that need it). Pass `activeContext` to `useGetXxxDetail`. Add `EmptyStateBody` + `useCatchForbiddenResources("xxxs", { open, resourceName, resourceLabel, onForbiddenDetected: onClose })` — the hook auto-resets on open and fires toast + `onClose` when forbidden. Guard on `xxx?.Name` (not `xxx`) to show body vs empty state.

7. **`views/DetailDrawerContext.tsx`**: add a new action type to `DetailDrawerAction` union, a field to `DetailDrawerState`, a `case` in `detailDrawerReducer`, and the context value entry. **Never add a new `useState` here** — all selected-resource state goes through the single `useReducer`. (Do NOT touch `MainLayoutContext.tsx` — it only holds `activeContext`/`namespace`/`onNamespaceChange`.)

8. **`DetailBlock.tsx`**: import and render the new drawer, wired to context values. `DetailBlock` does **not** accept or pass `context` — drawers read `activeContext` themselves via `useMainLayoutContext()` and the rest via `useDetailDrawerContext()`.

9. **Views**: call `onToggleXxxDetail(namespace, name)` on row click or `ResourceLink` click. Do NOT render `<XxxDetailDrawer>` in the view.

### Loading and empty states

**As of 2026-07-18, all drawers follow a two-gate render pattern:**

1. **Loading gate (first check):** destructure `isLoading` from the query hook. If `true`, render `<LoadingSpinner className="h-auto flex-1" />` immediately and return.
2. **Empty gate (second check):** guard on `data?.Name` or (namespace-scoped) `data?.Name && props.namespace`. If falsy, render `<ResourceDetailEmptyBody>`.
3. **Real content:** render the Body component once both gates pass.

Both gates go **inside the Body component** (e.g., `XxxDrawerBody`), after destructuring the hook result:

```tsx
export const XxxDrawerBody: FC<{ xxx: Xxx }> = ({ xxx }) => {
  const { data, isLoading } = useGetXxxDetail(...);
  
  if (isLoading) {
    return <LoadingSpinner className="h-auto flex-1" />;
  }
  if (!data?.Name) {
    return <XxxDetailEmptyBody />;
  }
  
  // Real body content here
  return (...)
};
```

`LoadingSpinner` is imported from `@galacius/design-system` (added to existing design-system import if not already present). This mirrors the pattern in `HelmReleaseDetailDrawer.tsx` lines ~287-305 and the outer drawer's hasData ternary (see [[detail_drawer_pattern#Empty state]] below).

**Excluded from this rollout:** `PortForwardDetailDrawer.tsx` (data comes from a prop, no async query hook); `HelmChartDetailDrawer.tsx` (multiple independent tab-scoped loading states, not single-body pattern).

### Empty state when hook returns `{}` (empty struct)

The backend returns `dto.Xxx{}` (empty, Name="") on errors. Guard on `xxx?.Name`, not `xxx`.

**As of 2026-07-18, the design-system `ResourceDetailDrawer` no longer accepts `hasData`/`resourceKind`/`resourceName` props on the drawer wrapper itself.** Gating is now the consumer's responsibility, done via an explicit ternary in JSX rather than an internal prop. `ResourceDetailEmptyBody` **was removed and then restored** (same day) once it became clear all 34 per-resource local `XxxDetailEmptyBody` components were byte-for-byte identical except for the kind label — it's now generalized to a single `resourceKind: string` prop (no `resourceName`, since none of the local versions ever rendered the name).

**New drawers must implement their own local `hasData` gating, but reuse the shared `ResourceDetailEmptyBody` — do not hand-roll a per-resource empty body component:**

1. **Outer drawer component computes `hasData` before render and ternary-gates the Body against `ResourceDetailEmptyBody`:**

   ```tsx
   const XxxDetailDrawer: FC<{ xxxName: string | null; xxxNamespace: string | null }> = (props) => {
     const hasData = !!props.xxxName; // cluster-scoped; namespace-scoped adds `&& !!props.xxxNamespace`

     return (
       <ResourceDetailDrawer open={!!props.xxxName} onClose={onClose}>
         {hasData ? (
           <XxxDrawerBody
             key={`${props.xxxNamespace}/${props.xxxName}`}
             xxxName={props.xxxName}
             xxxNamespace={props.xxxNamespace}
           />
         ) : (
           <ResourceDetailEmptyBody resourceKind="Xxx" />
         )}
       </ResourceDetailDrawer>
     );
   };
   ```

   **Special case:** If a drawer has extra JSX (e.g., `ReplicaSetDetailDrawer` with its `ReplicaSetScaleModal`) that sits after the Body ternary, inside `<ResourceDetailDrawer>`, that's fine — the ternary only wraps the Body itself, not the entire wrapper's children.

2. **The Body component does its own loading + empty gating** (query hook owns `isLoading`/`data`, independent of the outer `hasData` which only guards against null identifiers) — also using `ResourceDetailEmptyBody`:

   ```tsx
   export const XxxDrawerBody: FC<{ xxxName: string; xxxNamespace: string | null }> = (props) => {
     const { data, isLoading } = useGetXxxDetail(...);

     if (isLoading) return <LoadingSpinner className="h-auto flex-1" />;
     if (!data) return <ResourceDetailEmptyBody resourceKind="Xxx" />;

     // Real body content here
   };
   ```

3. **Two files were never part of the hasData-ternary rollout** — they get data from a prop/parent rather than a query hook, and use direct truthy-conditional rendering instead of `hasData` + `ResourceDetailEmptyBody`:
   - `PortForwardDetailDrawer.tsx` — data comes from a `PortForward | null` prop, no async query hook. `{pf && <PortForwardDrawerBody ... />}`.
   - `HelmChartDetailDrawer.tsx` — multiple independent tab-scoped loading states, not single-body pattern. `{chartName && repository && <HelmChartDetailDrawerBody ... />}`.

### ResourceDetailDrawer wrapper (`design-system/src/components/drawers/ResourceDetailDrawer.tsx`)

**As of 2026-07-18:** `ResourceDetailDrawer` itself is a thin wrapper — `Sheet`/`SheetContent` plus standard drawer sizing (`w-200 sm:max-w-200`). Props: `open`, `onClose`, `className`, `children`. No `hasData`/`resourceKind`/`resourceName` on the drawer — gating happens via ternary in the consumer's JSX (see above). The same file also still exports `ResourceDetailEmptyBody` (`resourceKind: string` prop only — renders `<p className="text-muted-foreground p-4 text-xs">There are no information for this {resourceKind}.</p>`), `ResourceDetailDrawerHeader` (standard bordered header row), and `ResourceDetailDrawerBody` (ScrollArea + padding wrapper).

All 34 module drawers + `HelmReleaseDetailDrawer.tsx` were rolled over to `<ResourceDetailEmptyBody resourceKind="..." />`, replacing their local `XxxDetailEmptyBody` consts — do not reintroduce a per-resource empty-body component.

**Migration completed 2026-07-10/11:** all 35 `XxxDetailDrawer.tsx` files under `frontend/src/app/clusters/modules/**` (+ 2 Helm plugin drawers) were migrated to this wrapper (parallel `/agent-team --feature-dev` batch run, 5 developer agents). Every drawer now imports `ResourceDetailDrawer` instead of hand-rolling `Sheet`/`SheetContent`. New drawers should follow this pattern from the start — no more raw `Sheet` wrapping, and gating logic lives locally per the pattern above.

Gotchas hit during the original migration:

- `HelmChartDetailDrawer.tsx` doesn't render its own `SheetHeader`/`SheetTitle` (the metadata block already serves as the header).
- `PortForwardDetailDrawer.tsx` doesn't take a plain `name` prop — it takes a `PortForward` object. Its `PortForwardDrawerBody` uses `useResourceLinks()` for the kind-conditional "Resource Name" `ResourceLink` (mirrors the `EventDetailDrawer` pattern of `resourceLinks[kind.toLowerCase()](namespace, name)`) rather than manually destructuring individual `onToggleXxxDetail` handlers per kind.

**Gotcha: `SheetHeader`/`SheetTitle` cannot be moved outside `SheetContent`.** `SheetContent` renders through `SheetPortal`, which teleports its subtree to a portal root. Anything rendered as a sibling of `SheetContent` (i.e. outside it) is NOT portaled and won't appear inside the sliding drawer panel at all — it just renders in normal document flow wherever the wrapper sits in the tree. The header can be hoisted to the top of `SheetContent`'s children (above the `hasData` conditional) to render once for both states, but it must stay nested inside `SheetContent`. If hoisting the header this way, resource-specific CTA buttons (e.g. Edit/Delete on `ClusterRoleBindingDrawerBody`) need a `headerActions?: ReactNode`-style slot prop since the empty state has no actions.

### 403 Forbidden error handling

The Go backend swallows errors from `GetXxxByName` (returns empty struct, nil error), so `error?.message.includes("forbidden")` never fires. Use `useCatchForbiddenResources` instead — it listens to the `"resource:forbidden"` Wails WebSocket event. The hook handles the toast and closes the drawer directly from the event handler (no effects, no state hop).

Resource keys match the `IsForbidden("xxx")` strings in Go (e.g. `"pods"`, `"jobs"`, `"roles"`, `"namespaces"`, `"clusterroles"`, `"serviceaccounts"`, `"nodes"`).

Pass `open`, `resourceName`, `resourceLabel`, and `onForbiddenDetected` as options — no `useEffect` or `useRef` needed in the drawer:

```tsx
import { useCatchForbiddenResources } from "../../hooks/useCatchForbiddenResources";
import { useMainLayoutContext } from "@/views/clusters/MainLayoutContext";

const { activeContext } = useMainLayoutContext();
const { data: xxx } = useGetXxxDetail(activeContext, xxxNamespace, xxxName);
useCatchForbiddenResources("xxxs", {
  open,
  resourceName: xxxName,
  resourceLabel: "Xxx",
  onForbiddenDetected: onClose,
});
```

The hook auto-resets forbidden state when `open` transitions to `true`. Do NOT import `toast` in the drawer for this purpose — the hook shows the toast itself.

For the **list view** (MainLayout), pass only `{ labelMap: RESOURCE_LABEL }` — the hook shows "cannot list" toasts for each forbidden resource type.

**Critical:** `labelMap` is the discriminating signal between list-view and drawer callers. The hook's list-view branch only fires when `opts?.labelMap` is truthy. Drawer callers must NEVER pass `labelMap`. If you pass `RESOURCE_LABEL` directly as the second argument (not wrapped in `{ labelMap: ... }`), TypeScript won't error but the hook silently loses the label map AND the guard breaks — causing all always-mounted drawers to fire spurious forbidden toasts on page load.

### ResourceLink inside a detail drawer (opening another drawer)

Use `truncate` + `truncateTextClassName` for long names in table cells:

```tsx
const { onToggleJobDetail } = useDetailDrawerContext()

<ResourceLink
  truncate
  truncateTextClassName="max-w-40"
  onClick={() => onToggleJobDetail(j.Namespace, j.Name)}
>
  {j.Name}
</ResourceLink>
```
