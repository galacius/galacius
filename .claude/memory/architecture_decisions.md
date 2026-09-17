---
name: architecture-decisions
description: "galacius architecture decisions — IPC pattern, caching/watching, scoped detail-push pattern, per-cluster query isolation, code splitting, view layout, DTO design, package deps, Wails bindings, macOS build"
metadata:
  node_type: memory
  type: project
  originSessionId: 4c9d20f2-fae5-4639-a340-3b791fa9bae3
  modified: 2026-09-08T00:00:00.000Z
---

### IPC Pattern

All Go methods exported on `App` struct are auto-bound to TypeScript by Wails. Map heavy K8s objects to lean DTOs before serializing — never forward raw `*corev1.Pod` etc. to the frontend.

### Caching / Watching

Use `SharedInformerFactory` (watch + in-memory cache) instead of polling. List endpoints read from the lister: `lister.Pods(ns).List(labels.Everything())` — no API round trip. Emit Wails events from informer handlers; patch the TanStack Query cache on the frontend.

**Namespace-filtered list pattern** — every `List<Kind>(lister, namespaces []string)` in `internal/kube/resources/*.go` and every `Get<Kind>Summary()` in `internal/app/*.go` branches on `namespaces`:
- non-empty: loop `namespaces` and call the namespace-scoped sub-lister (`lister.Pods(ns).List(...)`) per namespace, unioning results — reads only the namespaces actually selected instead of the whole cluster-wide cache.
- empty/nil: falls back to `lister.List(labels.Everything())` (cluster-wide) — this is load-bearing, not optional. `activeNamespaces` (`internal/app/app.go`) is documented as `empty/nil = all namespaces`, and defaults to empty on a fresh connect, so skipping this fallback (e.g. returning an empty result for `len(namespaces) == 0`) breaks the default "all namespaces" view entirely.

Per-namespace list errors (e.g. RBAC 403 on one namespace) are tolerated and logged, not propagated — the union still returns results from the namespaces that succeeded. A cluster-wide list error *is* propagated (no partial-success fallback available at that scope). `pvc.go`'s `ListPersistentVolumeClaims` does this twice (PVCs + cross-referenced pods); `endpoint.go`'s `ListEndpoints` needs a `//lint:ignore SA1019` on the `corev1.Endpoints` var in both branches since the type is deprecated (`go tool staticcheck` requires its own `//lint:ignore CheckName reason` format here, not golangci-lint's `//nolint:`).

All 24 `emit<Kind>()` Wails-event-push functions delegate to the same `List<Kind>()`/`Get<Kind>Summary()` functions above — no separate namespace-filtering logic to maintain on the push path.

`kube.NewFactoryHandle` (`internal/kube/informers.go`) blocks (bounded to 30s) until every informer's initial LIST has synced before returning, so `Connect()` only marks a context active — and the frontend only unblocks its first List*/Get* queries — once listers are warm. See [[gotcha_informer_cache_sync_race]].

```go
// Go side (emit.go)
runtime.EventsEmit(a.ctx, "pods:update", pods)

// TS side (useGetPods.ts)
EventsOn("pods:update", (pods) => {
  queryClient.setQueryData([QUERY_KEY_PODS, input], data)
})
```

**Error events** — when a resource informer gets a 403 Forbidden, Go emits `resource:forbidden` with the resource key string (e.g. `"ingresses"`). The payload is emitted at most once per resource per connection (deduplicated via `sync.Map` in `Connect`). The frontend `useCatchForbiddenResources` hook subscribes to this event and shows a sonner error toast when the user is on or navigates to that resource's view.

### Single-Item Detail Pattern

For resource detail drawers, use a `Get<Resource>ByName(namespace, name string)` Go function that calls `lister.Xxxs(namespace).Get(name)` directly — reads from the informer cache, zero API round trips. Expose via Wails binding. The frontend hook (`useGet<Resource>Detail`) calls this binding with its own query key (`QUERY_KEY_<RESOURCE>_DETAIL`) and `enabled: !!context && !!namespace && !!name` (namespace-scoped) or `enabled: !!context && !!name` (cluster-scoped).

Do NOT filter the list client-side (`ListXxx().find(...)`) inside detail hooks — the `Get*ByName` approach avoids transferring the full list for a single item lookup.

After adding `GetXxxByName` to Go, manually add the export to `frontend/src/api/resources.ts` (the re-export list at the top) — Wails bindings are auto-generated into `wailsjs/` but `resources.ts` is maintained by hand.

Existing examples:

- Cluster-scoped: `GetClusterRoleByName` → `useGetClusterRoleDetail`, `GetNamespaceByName` → `useGetNamespaceDetail`, `GetNodeByName` → `useGetNodeDetail`
- Namespace-scoped: `GetRoleByName` → `useGetRoleDetail`, `GetServiceAccountByName` → `useGetServiceAccountDetail`, `GetPodByName` → `useGetPodDetail`, `GetJobByName` → `useGetJobDetail`

### Scoped Detail-Push Pattern

Extends the Single-Item Detail Pattern above with a live-update path, for the subset of resources that have a genuinely separate `Xxx`/`XxxDetail` DTO (list DTO is lean, Detail DTO adds `CreatedAt`/`Labels`/`Annotations`/`ManagedFields`/etc, sometimes sensitive — e.g. Secret data). Broadcasting the full Detail payload on the existing plural list topic (`"secrets:update"`) to every subscriber whenever *any* item in the list changes is wasteful and, for sensitive fields, undesirable. Instead these resources get a second, singular Wails topic (`"secret:update"`) that only ever carries the one item currently open in that kind's detail drawer.

10 resources use this pattern today: **Secret, ResourceQuota, PersistentVolumeClaim, HPA, LimitRange, NetworkPolicy, PodDisruptionBudget, Ingress, PersistentVolume, ValidatingWebhookConfig** (PersistentVolume and ValidatingWebhookConfig are cluster-scoped, so their watch/emit signatures drop the namespace argument). The other ~18 resources (Deployment, CronJob, DaemonSet, Job, ReplicaSet, StatefulSet, ConfigMap, Service, Node, Namespace, Role/RoleBinding/ClusterRole/ClusterRoleBinding, ServiceAccount, Event, Endpoint(Slice), IngressClass, …) share one DTO for list and detail, so the plural list-push already carries everything the detail view needs — no singular topic for these.

**Backend:**

- `internal/app/detail_watch.go` defines a shared `detailWatch` type: a single mutex-guarded `(namespace, name)` key — *not* a refcounted map — since only one detail drawer of a given kind can be open at a time. `watch(namespace, name)` sets the key; `unwatch(namespace, name)` clears it only if it still matches (guards against a stale unwatch from an already-superseded watch); `get() (namespace, name string, ok bool)` reads it. For cluster-scoped kinds the namespace half is always `""`.
- Each resource file (e.g. `internal/app/secret.go`) adds: a `watchedXxx detailWatch` field on `App` (declared in `app.go`), `WatchXxxDetail(namespace, name)` / `UnwatchXxxDetail(namespace, name)` Wails-bound methods that thinly call `watch`/`unwatch`, and `emitXxxDetail()` — reads the current watched key via `get()`, looks the item up through the lister (`kubeResources.GetXxxByName(...)`), and `runtime.EventsEmit`s it on the singular topic only if a key is set. `emitXxxDetail` is **never called from within `emitXxxs()`** — it is a fully decoupled function.
- `emitXxxDetail` needs its own dedicated `debouncer.Debouncer` instance (`debXxxDetail := debouncer.NewDebouncer(...)`, registered via `h.RegisterDebouncer(...)` in `app.go`) — `Debouncer` holds exactly one callback and one timer, so it can't be shared with the existing list-emit debouncer. Both debouncers are triggered side by side (`.Trigger(ns)`) from the same informer event-handler callback (`SetXxxsEventHandler` or the raw informer `AddEventHandler` block for kinds without that helper).

**Frontend:**

- `useXxxUpdateEvents(namespace, name)` (or `(name)` for cluster-scoped kinds) — in a `useEffect` keyed on the watched identity, calls `WatchXxxDetail`/`UnwatchXxxDetail` on mount/unmount and subscribes to the singular topic via `EventsOn`, filtering pushes to the exact watched item. Values are staged in local `useState`, but **stale values are discarded via a `useMemo` guard** (`return latest && latest.Name === name ? latest : undefined`), not by resetting state synchronously inside the effect — a synchronous `setState(undefined)` reset in the effect body trips the `react-hooks/set-state-in-effect` ESLint rule and causes a redundant cascading render.
- The owning `useGetXxxDetail` hook calls `useXxxUpdateEvents` and merges its result over `useQuery` data via `useMemo`: `latest ?? query.data`.
- **Gotcha (caused 2 real bugs, in Ingress and ValidatingWebhookConfig, fixed 2026-09):** do not merge a Detail hook's local push state directly from the *plural* list-topic hook's payload via an unsafe `as XxxDetail` cast. The list DTO is missing the Detail-only fields, so the cast silently produces an object with those fields `undefined` — invisible at compile time, but every subsequent list-topic push (e.g. another item's status changing) overwrites the merged detail with a payload stripped of `Annotations`/`CreatedAt`/`Labels`/etc. The singular-topic pattern above exists specifically to avoid this: only fully-populated Detail payloads for the exact watched item are ever merged in.

### Per-Cluster Query Isolation

All TanStack Query hooks include `context` (cluster name) in their query key so each cluster has an independent cache. When `activeContext` changes, `App.tsx` calls `queryClient.removeQueries` to evict the previous cluster's data immediately.

- Query keys: `[KEY, { context, namespace }]` or `[KEY, context]`
- All queries gated with `enabled: !!context` — no fetch fires without an active cluster
- `MainLayout` uses `key={activeContext}` to force full remount on cluster switch

### Code Splitting

All resource views are lazy-loaded via `React.lazy` in `MainLayout`. Each view is a separate JS chunk loaded only when first navigated to. The content area is wrapped in `<Suspense>`.

### View Layout Pattern

Every resource view follows the same structure:

1. Header bar: title, item count, namespace `<Select>` (namespace-scoped resources only), search `<Input>`
2. `<Table>` with columns relevant to the resource
3. Empty state: `<TableCell colSpan={n}>Item list is empty</TableCell>` when the list is empty

### DTO Design

Each resource type has a dedicated type in `packages/core/kube/dto/<type>.go` (no `DTO` suffix — the `dto.` package prefix already signals intent) and a matching TypeScript interface in `packages/core/frontend/src/types/resources/<type>.ts` (same spirit as the Go side — one file per resource, e.g. `pod.ts`, `deployment.ts`; a `shared.ts` holds cross-resource types like `ManagedField`). Conversion logic (`toXxx`) and list functions (`ListXxx`) live in `internal/kube/resources/<type>.go`. (Moved from `internal/dto` in Phase 4 of [[plugin-architecture-inversion]] — that package was deleted 2026-08-18 once every importer migrated. Then moved again from `packages/core/dto` to `packages/core/kube/dto` on 2026-08-27.)

Each module's `frontend/src/app/clusters/modules/<group>/<resource>/api/resources.ts` no longer declares the interfaces itself — it only re-exports the Wails-bound methods (`export { ListPods, GetPodByName, ... } from "@wailsjs/go/app/App"`) plus `export type { Pod, PodSummary, ... } from "@galacius/core"`. This keeps every hook/component's existing import path (`from "../../api/resources"`) unchanged while the actual shape lives in the shared package — moved 2026-08-20 to mirror the DTO pattern above. Cross-resource type deps (e.g. `Deployment` needing `TolerationDetail` from `pod.ts`, `Role` needing `PolicyRule` from `clusterrole.ts`) are same-directory imports inside `packages/core/frontend/src/types/resources/`. After editing any file there, `pnpm build:core:fe` (root script; `pnpm --filter @galacius/core run build` directly) must be rerun to refresh `packages/core/frontend/dist` before the frontend picks up the change.

| Type (`dto.*`)          | Key fields                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Pod`                   | Name, Namespace, Status, Ready, Containers, Restarts, ControlledBy/ControlledByName, NodeName, QoS, Age, CPU/Memory/Disk (label + percent), raw req/lim fields; detail fields: CreatedAt, ServiceAccount, PriorityClass, TerminationGracePeriod, HostIPs, PodIPs, Tolerations, Labels, Annotations, ManagedFields, Conditions ([]PodCondition), ContainerDetails ([]PodContainerDetail — probes, env, mounts, ports, last status), Volumes ([]PodVolume) |
| `Deployment`            | Name, Namespace, Pods, Replicas, Conditions ([]string list view), Age; detail: CreatedAt, Labels, Annotations, ManagedFields, ReplicasDetail, Selector, StrategyType, DeploymentConditions ([]DeploymentCondition with Status for coloring)                                                                                                                                                                                                              |
| `DaemonSet`             | Name, Namespace, Pods (ready/desired), NodeSelector, Age; detail: CreatedAt, Labels, Annotations, ManagedFields, Selector, Images, StrategyType, Tolerations (count), PodStatus (desired/ready/available/unavailable string)                                                                                                                                                                                                                             |
| `StatefulSet`           | Name, Namespace, Pods (ready/desired), Replicas, Age                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ReplicaSet`            | Name, Namespace, Desired, Current, Ready, Age, OwnerName, OwnerKind; detail: CreatedAt, Labels, Annotations, ManagedFields, Selector, NodeSelector, Images, ReplicasDetail, Tolerations, Affinities, PodStatus                                                                                                                                                                                                                                           |
| `Service`               | Name, Namespace, Type, ClusterIP, Ports, ExternalIP, Selector, Age, Status; detail: CreatedAt, Labels, Annotations, ManagedFields ([]ManagedField), SessionAffinity, InternalTrafficPolicy, ClusterIPs, IPFamilyPolicy, IPFamilies, ServicePorts ([]ServicePort with Name/Port/TargetPort/Protocol/NodePort)                                                                                                                                             |
| `Endpoint`              | Name, Namespace, Endpoints (addr:port joined), Age; detail: CreatedAt, Labels, Annotations, ManagedFields ([]ManagedField), Subsets ([]EndpointSubset — each has Addresses []EndpointAddress{IP,Hostname,TargetName} and Ports []EndpointPort{Name,Port,Protocol})                                                                                                                                                                                       |
| `EndpointSlice`         | Name, Namespace, AddressType, Ports ([]EndpointSlicePort), Endpoints ([]EndpointSliceEndpoint), Age; detail: CreatedAt, Labels, Annotations, ManagedFields, ControlledBy, ServiceName                                                                                                                                                                                                                                                                    |
| `ConfigMap`             | Name, Namespace, Keys ([]string — includes binary keys), Age; detail: CreatedAt, Labels, Annotations, ManagedFields ([]ManagedField), Data (map[string]string — string keys only; binary keys present in Keys but absent here)                                                                                                                                                                                                                           |
| `Lease`                 | Name, Namespace, HolderIdentity, LeaseDurationSeconds (int32), RenewTime, AcquireTime, LeaseTransitions (int32), Age; detail: CreatedAt, Labels, Annotations, ManagedFields ([]ManagedField)                                                                                                                                                                                                                                                             |
| `Node`                  | Name, Status, Roles, Version, Age, Taints, CPU/CPUPercent, Memory/MemPercent, Disk/DiskPercent; detail fields: CreatedAt, Labels, Annotations, ManagedFields, Addresses ([]NodeAddress), OS, OSImage, KernelVersion, ContainerRuntime, Conditions ([]NodeCondition), Capacity, Allocatable                                                                                                                                                               |
| `Namespace`             | Name, Labels, Age, Status                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Secret`                | Name, Namespace, Labels ([]string), Keys ([]string), Type, Age                                                                                                                                                                                                                                                                                                                                                                                           |
| `CronJob`               | Name, Namespace, Schedule, Timezone, Suspend, Active, LastSchedule, Age                                                                                                                                                                                                                                                                                                                                                                                  |
| `Job`                   | Name, Namespace, Completions (succeeded/desired), Conditions ([]string), Age                                                                                                                                                                                                                                                                                                                                                                             |
| `ResourceQuota`         | Name, Namespace, Age                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `LimitRange`            | Name, Namespace, Age                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `HPA`                   | Name, Namespace, Metrics, MinPods, MaxPods, Replicas, Status, Age                                                                                                                                                                                                                                                                                                                                                                                        |
| `PodDisruptionBudget`   | Name, Namespace, MinAvailable, MaxUnavailable, CurrentHealthy, DesiredHealthy, Age                                                                                                                                                                                                                                                                                                                                                                       |
| `Ingress`               | Name, Namespace, LoadBalancers, Rules, Age                                                                                                                                                                                                                                                                                                                                                                                                               |
| `NetworkPolicy`         | Name, Namespace, PolicyTypes, Age                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `PortForward`           | ID, Name, Namespace, Kind, PodPort (resolved numeric), TargetPort (original unresolved value — used for CTA active-session match in ServiceDetailDrawer), ServicePort (service-facing port e.g. 443; empty for pod-direct forwards), LocalPort, Scheme ("http"/"https" — set at creation, used by PortForwardDetailDrawer ExternalLink), Protocol, Address, Status                                                                                       |
| `PersistentVolumeClaim` | Name, Namespace, StorageClass, Size, Pods (comma-joined), Age, Status                                                                                                                                                                                                                                                                                                                                                                                    |
| `PersistentVolume`      | Name, StorageClass, Capacity, Claim, Age, Status                                                                                                                                                                                                                                                                                                                                                                                                         |
| `StorageClass`          | Name, Provisioner, ReclaimPolicy, Default (bool), Age                                                                                                                                                                                                                                                                                                                                                                                                    |
| `PriorityClass`         | Name, Value (int32), GlobalDefault (bool), Description, PreemptionPolicy, Age; detail: CreatedAt, ManagedFields ([]ManagedField)                                                                                                                                                                                                                                                                                                                         |
| `ServiceAccount`        | Name, Namespace, Age                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ClusterRole`           | Name, Age                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `ClusterRoleBinding`    | Name, Bindings (subject names joined), Age                                                                                                                                                                                                                                                                                                                                                                                                               |
| `RoleBinding`           | Name, Namespace, Bindings (subject names joined), Age                                                                                                                                                                                                                                                                                                                                                                                                    |
| `Role`                  | Name, Namespace, Age                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `Event`                 | Type, Message, Namespace, InvolvedObject, Source, Count, Age, LastSeen, CreatedAt (Unix)                                                                                                                                                                                                                                                                                                                                                                 |

### Package Dependency Direction

```text
packages/core/kube/dto   →  (nothing — leaf package, pure type definitions; separate Go module, imported via replace directive — see [[go_work_removal_todo]])
internal/storage           →  (nothing — leaf package, directory resolver only)
internal/kube/resources  →  packages/core/kube/dto  (uses DTO types) + k8s.io/...
internal/kube            →  packages/core/kube/dto  (metrics.go uses dto.NodeUsage)
internal/kube            →  internal/kube/resources  (FactoryHandle, informers)
internal/config          →  internal/storage  (settings path resolver, new 2026-08-11)
internal/app             →  internal/storage  (plugins root dir resolver, new 2026-08-11; also injected into internal/plugin/assets.go's resolvePluginDir callback — internal/plugin itself has no direct storage import)
internal/app             →  packages/core/kube/dto  (DTO types in method signatures)
internal/app             →  internal/kube/resources  (list functions)
internal/app             →  internal/kube  (FactoryHandle, client primitives)
internal/app             →  internal/config  (settings I/O)
```

No circular imports. `dto` and `storage` are the leaves — `dto` holds pure type definitions, `storage` resolves persistent data directory. `packages/core/kube/dto` lives under the `packages/core/kube` directory (sibling to `packages/core/kube.LoadingRules`) but does not import it — no cycle.

### Clientset Cache

Cache per-context clientsets in `map[string]*kubernetes.Clientset` guarded by a mutex. Use `clientcmd.NewDefaultClientConfigLoadingRules()` to respect `$KUBECONFIG` and merged configs.

### macOS Build & Signing

`scripts/build.sh` wraps `wails build` and on macOS runs:

```bash
xattr -cr build/bin/galacius.app
codesign --force --deep --sign - build/bin/galacius.app
```

Ad-hoc signing (no Apple Developer account). Sufficient for local use; not valid for App Store or notarization.

### Auto-Update

Install script URL is configured in `.env` as `INSTALL_SCRIPT_URL`, loaded at startup by `godotenv.Load()` in `main.go`. Falls back to the GitHub API endpoint for private repos. When the repo goes public, switch to the raw URL in `.env`:

```bash
# Private repo (current default):
INSTALL_SCRIPT_URL=https://api.github.com/repos/galacius/galacius/contents/scripts/install.sh
# Public repo:
INSTALL_SCRIPT_URL=https://raw.githubusercontent.com/galacius/galacius/master/scripts/install.sh
```

### Wails Bindings

Auto-generated by `wails dev`/`wails build` into `frontend/wailsjs/`. When adding a new exported Go method without running `wails dev`, manually add entries to:

- `frontend/wailsjs/go/app/App.js` — JS binding stub
- `frontend/wailsjs/go/app/App.d.ts` — TypeScript declaration
- `frontend/wailsjs/go/models.ts` — DTO class under `export namespace resources {}`
