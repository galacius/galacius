# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Galacius — a desktop Kubernetes dashboard built with [Wails v2](https://wails.io) (Go backend + React/TypeScript frontend, native webview shell, no Electron). Root module `github.com/galacius/galacius`. pnpm workspace with `frontend` and `design-system` as packages. Plugins are separate Go modules, launched as subprocesses, driven over HTTP (business logic) plus a native gRPC pub/sub channel (host↔plugin push events) — never compiled into the main binary. No plugins currently ship; the plugin host (`internal/plugin`, marketplace UI, tray registry) is generic infrastructure for plugins installed at runtime.

## Commands

### Dev

```bash
pnpm dev              # hot-reload desktop app (builds design-system + core frontend once, then wails dev)
wails dev             # same as pnpm dev, without the initial build steps (requires design-system/core built first)
pnpm --filter galacius-frontend run dev  # frontend only (vite dev server without Go backend, rarely useful)
```

### Build

```bash
pnpm build:app          # full app build (bash scripts/build.sh; wraps `wails build`, macOS ad-hoc codesigns)
pnpm build:ds            # build @galacius/design-system package (needed before frontend build)
pnpm build:app:fe        # build:ds + frontend build only (no Wails binary)
```

### Lint / format / vet (run after every change, before reporting done)

```bash
pnpm format              # prettier --write across ts/tsx/js/json/css/md/yml
pnpm lint:fe              # eslint frontend/src design-system/src packages/core/frontend/src
pnpm lint:be              # go vet + staticcheck for ./internal/... and the packages/core module
```

### Tests

```bash
pnpm test:be              # go test -race -v ./internal/...
pnpm test:be:coverage
pnpm test:fe               # vitest run (frontend)
pnpm test:fe:coverage
pnpm test:ds                # design-system vitest
```

Single Go test: `go test -race -run TestName ./internal/app/...`
Single frontend test: `pnpm --filter galacius-frontend exec vitest run path/to/File.test.tsx`

### Local test cluster

```bash
minikube addons enable metrics-server
# or, for Docker Desktop's docker-desktop context, patch metrics-server with --kubelet-insecure-tls (see CONTRIBUTING.md)
```

## Architecture

### Backend (`internal/`)

- **`internal/app`** — one file per Wails-bound method group (`pod.go`, `deployment.go`, `node.go`, …), plus `app.go` (the `App` struct, `Connect`/`Disconnect`, event wiring). Every exported method on `App` is auto-bound to TypeScript by Wails (`main.go` binds only `*App` — `bindList := []any{a}`; nothing else is exposed directly).
- **`internal/kube`** — client/informer plumbing: per-context `*kubernetes.Clientset` cache (mutex-guarded map), `clientcmd` loading rules (respects `$KUBECONFIG`), `SharedInformerFactory` handles, node/pod metrics fetch.
- **`internal/kube/resources`** — per-resource-type `ListXxx`/`toXxx` conversion logic (raw K8s object → DTO).
- **`packages/core/kube/dto`** — leaf package, pure DTO type definitions (no imports of `kube`/`app`), imported by `internal/` as a Go module dependency (see Plugin architecture below). One type per K8s resource kind; **fields must use `string` for timestamps, never `time.Time`** — Wails can't generate TS bindings for it. `internal/dto` no longer exists — it was removed once every importer moved to `packages/core/kube/dto`.
- **`internal/plugin`** — generic plugin host: discovery, download/verify, process lifecycle (`loader.go`). Business-logic calls to a plugin go over plain HTTP to the plugin's own local server (`App.GetPluginBackendAddr(pluginID)` resolves the `127.0.0.1:<port>` address, relaunching/health-checking as needed); push-style host↔plugin events (cluster context, namespace filter changes) go over a native gRPC pub/sub channel instead (types from `packages/core/pb`) — see Plugin architecture below.
- **`internal/updater`** — self-update (checks GitHub releases, downloads, swaps binary); split into `authenticated_updater.go` (private repo, token-based) and `unauthenticated_updater.go` (public repo, driven by a `manifest.json` release artifact — the single source of truth for per-OS/arch download filenames + SHA256, see `manifest.go`).
- **`internal/config`** — app config (`~/.galacius/settings.json`, via `internal/storage`).
- **`internal/storage`** — resolves `~/.galacius`, the single on-disk directory for all persistent app data (settings, installed plugins). Leaf package (no internal deps); `internal/config` and `internal/app` both depend on it.

**Package dependency direction** (no cycles): `packages/core/kube/dto` ← `kube/resources` ← `kube` ← `app`; `store` ← `config` ← `app`, `store` ← `app`. `packages/core/kube/dto` and `store` are the leaves.

### Core backend patterns

- **Watch, don't poll.** `SharedInformerFactory` caches K8s objects; `lister.Xxxs(ns).List(...)` reads from the in-memory cache, zero API round trips. `kube.NewFactoryHandle` blocks (≤30s) until every informer's initial LIST has synced before `Connect()` unblocks the frontend's first queries.
- **Namespace-scoped list reads**: every `List<Kind>()`/`Get<Kind>Summary()` unions per-namespace `lister.Xxxs(ns).List(...)` calls over `activeNamespaces` instead of reading the whole cluster-wide cache and post-filtering — narrowing the namespace selection actually reduces work. `activeNamespaces` is documented as `empty/nil = all namespaces` (`internal/app/app.go`) and defaults to empty on connect, so every such function must fall back to a plain `lister.List(labels.Everything())` when `namespaces` is empty — skipping that fallback breaks the default all-namespaces view.
- **Detail reads** use `Get<Resource>ByName(namespace, name)` → `lister.Xxxs(ns).Get(name)`, never `ListXxx().find(...)`.
- **Push updates via Wails events**, not polling: Go emits (`runtime.EventsEmit(a.ctx, "pods:update", pods)`), the frontend's per-resource `useXxxUpdateEvents` hook subscribes and the owning data-access hook merges the pushed payload over its `useQuery` result locally (no global cache-write hook).
- **Scoped detail-push pattern**, for the 10 resources with a genuinely separate `Xxx`/`XxxDetail` DTO (Secret, ResourceQuota, PVC, HPA, LimitRange, NetworkPolicy, PodDisruptionBudget, Ingress, PersistentVolume, ValidatingWebhookConfig): broadcasting full Detail payloads (which can carry sensitive/heavy fields not present on the list DTO) to every list subscriber is wasteful and leaky, so these resources additionally expose a singular Wails topic (`"secret:update"`, distinct from the plural `"secrets:update"` list topic) that only fires for the one item currently open in that kind's detail drawer. `App.WatchXxxDetail(namespace, name)`/`UnwatchXxxDetail(...)` (name-only for cluster-scoped kinds PersistentVolume/ValidatingWebhookConfig) register/clear interest in a single mutex-guarded `detailWatch` (`internal/app/detail_watch.go` — one open drawer per kind at a time, so a single key suffices, no refcounting); `emitXxxDetail()` is fully decoupled from `emitXxxs()` and fires off its own dedicated `Debouncer` instance triggered alongside the existing list debouncer inside the same informer event-handler callback (`Debouncer` holds exactly one callback/timer, so it can't be shared with the list emitter). Frontend: `useXxxUpdateEvents(namespace, name)` calls `WatchXxxDetail`/`UnwatchXxxDetail` in a `useEffect`, subscribes to the singular topic, and discards stale values via a `useMemo` guard (never a synchronous `setState` reset in the effect — trips `react-hooks/set-state-in-effect`); the owning `useGetXxxDetail` hook merges this over its `useQuery` data. Do not merge a Detail hook's local state directly from the plural list-topic payload via an `as` cast — it silently drops Detail-only fields on every subsequent list push (this happened to Ingress and ValidatingWebhookConfig before the pattern existed). See `.claude/memory/architecture_decisions.md`'s "Scoped Detail-Push Pattern" section for the full writeup.
- **Forbidden-resource (403) handling**: informer 403s emit `resource:forbidden` once per resource per connection; frontend's `useCatchForbiddenResources` toasts when the user is on/navigates to that view.
- Adding a new Go method: add it to the appropriate `frontend/src/app/clusters/modules/<group>/<resource>/api/resources.ts` file (each resource module re-exports its Wails-bound methods). New DTO types are defined in `packages/core/frontend/src/types/resources/` (one file per resource type) and re-exported from the module's `api/resources.ts` — Wails bindings are auto-generated into `frontend/wailsjs/` (no manual edits needed). After editing `packages/core/frontend/`, run `pnpm build:core:fe` to regenerate the vendor shims the frontend imports.
- `wails generate` mutates `go.mod` — never run it as a shortcut for other tasks.

### Plugin architecture

Plugins are **fully standalone Go modules** (e.g. in `galacius-plugins` repo, own `go.mod` under `github.com/galacius/galacius-plugins/plugins/<name>`). Each plugin ships its own frontend bundle too (`plugins/<name>/frontend`, its own workspace package). The host (`internal/`) and all plugins share a common contract via the `packages/core` nested Go module.

**Go module structure:**

- **`packages/core/` (nested module):** a sibling to `internal/`, with its own `go.mod` (`github.com/galacius/galacius/packages/core`), versioned via git tags shaped `packages/core/vX.Y.Z` — first published as `packages/core/v1.7.0`. Exports the plugin-host contract: protobuf service definitions (`packages/core/pb/`), data transfer objects (`packages/core/kube/dto/` — leaf package, no heavy deps), kubeconfig loading utilities (`packages/core/kube.LoadingRules` only, not full client/informer machinery), and shared host↔plugin pub/sub constants (`packages/core/util.EventTopic*` — was `packages/core/pluginsdk` before the 2026-08-27 rename).
- **Host import:** `internal/` imports `packages/core/{pb,kube,kube/dto,util}` via `go.mod`'s `require github.com/galacius/galacius/packages/core vX.Y.Z`, but a permanent `replace github.com/galacius/galacius/packages/core => ./packages/core` directive makes the host always build against local source — `packages/core` is the host's own extension surface (same pairing as `@galacius/core` resolved via frontend `workspace:*`), so host and core always ship from the same commit and the `require` version pin doesn't gate the host build. No root `go.work` file (the bare `replace` line is enough). This replaces parallel hand-maintained copies in `internal/`.
- **Plugin import:** plugins depend on `packages/core/` as a normal versioned Go dependency (e.g. `go get github.com/galacius/galacius/packages/core@vX.Y.Z` — the module path already includes `packages/core`, so the `@` suffix is just `vX.Y.Z`, not `packages/core/vX.Y.Z`), avoiding the old manual-sync cost of hand-copying DTO and proto files.

**Frontend packages:**

- **`@galacius/core` (pnpm workspace package):** provisioned at `packages/core/frontend/`, exports host-level React hooks (starting with `useResourceLinks`) for plugin frontends to import. Resolved via import map (`frontend/index.html`) and vendor shims (`frontend/public/vendor/galacius/core.js`), same pattern as `@galacius/design-system`. Versioned alongside the host app, not as a stable long-term SDK. See `packages/core/README.md` for rationale and versioning.

**Plugin subprocess model:**

- Plugin binary is launched as a subprocess by `internal/plugin`, emits a one-line JSON `READY` handshake (`httpPort`, plus pid/version) on stdout, then serves its own local HTTP server for business-logic calls.
- The main app still manages process lifecycle (spawn, health checks, restart detection). Host↔plugin push events use a single native gRPC pub/sub service (`packages/core/pb`'s `Plugin` service: `Subscribe(topic) → stream PubSubMessage` / `Publish(topic, payload)`), hosted by `internal/api/grpc` (`hostgrpc.GRPCServerConfig`) — the host publishes on topics like `cluster.context`/`namespaces.active` (`packages/core/util.EventTopic*`), plugins may only publish under their own `plugins.<pluginID>.*` prefix. Plugins authenticate to the host's gRPC server with a per-launch token (`internal/plugin`'s `TokenManager`); the older per-purpose unary RPCs (`GetCapabilities`/`SetClusterContext`/`Invoke`/separate watch streams) have been fully replaced by this generic pub/sub contract.
- Plugin frontend bundles are loaded dynamically and resolve `react`/`react-dom`/`@galacius/design-system`/`@galacius/core`/`@tanstack/react-query` as bare specifiers against the host's own module instances via import map + vendor shims — avoids duplicate instances that would break React Context or query client isolation.
- Plugins are installed at runtime from a marketplace (GitHub release manifests); nothing plugin-specific is compiled into `main.go`.

### Frontend (`frontend/src`)

- **`app/`** — all feature code. `app/clusters/modules/<group>/<resource>/` holds one folder per K8s resource (e.g. `workloads/pods`, `configs/secrets`, `networks/services`), each split into `components/`, `hooks/data-access/`, `hooks/data-mutation/`, `api/`. `app/clusters/shared/` holds cross-resource hooks/components/trays. `app/marketplace`, `app/settings`, `app/updater`, `app/about` are top-level non-cluster modules.
- **`design-system/`** (repo-root package, `@galacius/design-system`) — publishable UI kit. `atoms/` = shadcn-generated primitives wrapping `@base-ui/react` (NOT Radix — `TooltipTrigger` etc. use the `render` prop, not `asChild`). `components/` = composite/business components (buttons, drawers, modals, tables, toasts). Never import `design-system` → `app` except the one sanctioned exception (unified tray family registry, injected via props).
- **Per-cluster query isolation**: every TanStack Query hook's key includes `context` (cluster name); switching clusters calls `queryClient.removeQueries` and `MainLayout` remounts (`key={activeContext}`).
- **Code splitting**: every resource view + heavy widget (xterm, detail drawers) is `React.lazy`-loaded.
- All resource views follow one shape: header (title, count, namespace select, search) → `<Table>` → empty-state row.

### Unified tray system

Two built-in tray "families" (modification/YAML-edit, pod logs+exec) share one bottom-tray shell, and plugin-owned families can be merged in at runtime (see `usePluginTrayRegistry`) (`UnifiedTrayProvider`/`UnifiedTrayShell`, mounted once in `MainLayout.tsx`) via a discriminated-union tab type and a family→content-component registry. Open a tab from anywhere with `useUnifiedTray().openTab(family, params)`. To add a new resource's modification tray: add the kind to `ModificationResourceKind`, create `<Resource>ModificationTray.tsx` (mirror `NamespaceModificationTray.tsx`), register it in `modificationTrayRegistry.tsx` — no changes needed to the shell itself. See `.claude/memory/unified_tray_architecture.md` and `.claude/memory/modification_tray_architecture.md` for full detail.

### DTO/detail-drawer conventions

Each resource has a `dto.<Type>` (Go) and matching TS interface. List views use lean fields; detail drawers add `CreatedAt`, `Labels`, `Annotations`, `ManagedFields`, etc. Detail drawers render via `ResourceDetailDrawer` with an `isLoading`/empty two-gate pattern. Cross-resource references (Namespace, ClusterRole, owning workload, etc.) always render as `<ResourceLink onClick={...}>` wired to `DetailDrawerContext`'s `onToggle<Resource>Detail` (via `useResourceLinks`), never plain text.

## Project-specific conventions

- Imports: files within the same top-level dir (`design-system`, or a given `app/...` module) use **relative imports**, not the `@/...` alias — the alias is reserved for cross-top-level imports.
- Full UI conventions (shadcn-first rule, status badge variants, toast helpers, shared CTA button components, icon-button `aria-label` rule) are in `.claude/memory/component_guidelines.md` — check it before hand-rolling any of these.

## Memory

`.claude/memory/` contains extensive project memory (architecture decisions, file structure, gotchas, feature history) auto-maintained across sessions — check `.claude/memory/MEMORY.md` for the index when you need history/rationale beyond what's summarized here.
