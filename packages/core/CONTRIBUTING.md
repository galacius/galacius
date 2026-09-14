# Contributing to galacius-core

## Package layout

One Go package per concern (`pb/`, `kube/`, `kube/dto/`, `async/`, `util/`) deliberately leaves room for future host-utility packages to be added as sibling packages later without requiring a restructure. Follow the same pattern for new packages: one package, one concern, documented in `README.md`.

## Versioning

This module is tagged independently using Go's subdirectory-module convention:

- **Tag format:** `packages/core/vX.Y.Z` (e.g. `packages/core/v0.1.0`, `packages/core/v1.2.3`) — the tag prefix matches this module's path relative to the repo root.
- **In dependency declarations:** `go get github.com/galacius/galacius/packages/core@vX.Y.Z` (the module path already includes `packages/core`, so the `@` suffix is just the version, not the full tag).
- The host repo's main module (`github.com/galacius/galacius`) has its own separate tags (`v1.2.0`, etc.) and release cadence — they are independent.

### Host build vs. plugin build

The host (`internal/`) does not gate its build on the tagged version: `go.mod`'s `require github.com/galacius/galacius/packages/core vX.Y.Z` is paired with a permanent `replace github.com/galacius/galacius/packages/core => ./packages/core`, so the host always builds against local source. Bump the `require` version when tagging a release, but the `replace` line stays — host and core ship from the same commit by design, the same pairing as `@galacius/core` resolved via frontend `workspace:*`.

Plugins, by contrast, depend on this module as a normal versioned Go dependency with no `replace` — that's the whole point of tagging it.

## CI/CD

This module has its own CI job (the `core` job in `.github/workflows/job-build-check.yml`) that runs `go vet`, `go build`, and `staticcheck` independently, since it is a separate Go module (`go.mod`) with its own dependency tree. The root module's `go.mod` does not govern this module's build.

## History

- **Extraction (Phase 4):** the host's `internal/` code now imports `packages/core/{pb,kube,kube/dto}` directly as a Go module dependency. `internal/dto/` and `internal/plugin/pb/` were deleted once every importer moved over — there are no hand-maintained parallel copies left to sync.
- **`PluginLockFile.Timestamp` field type:** `kube/dto/plugin.go`'s `PluginLockFile.Timestamp` is `string` (RFC3339), matching the Wails binding convention (see root `CLAUDE.md`: "fields must use `string` for timestamps, never `time.Time`"). The old `internal/dto/plugin.go` copy had this mistyped as `time.Time` — that copy no longer exists. `internal/plugin/loader.go`'s lock-file write site uses `time.Now().Format(time.RFC3339)`.
- **gRPC contract rewrite:** the original `pb` service exposed per-purpose unary RPCs (`GetCapabilities`/`SetClusterContext`/`Invoke` plus separate watch streams). These were fully replaced by the generic `Subscribe`/`Publish` pub/sub contract described in `README.md`.
- **`async/` extraction:** the plugin-side gRPC dial/subscribe/reconnect logic (previously duplicated per plugin as `WatchClusterContext`/`WatchActiveNamespaces`) was consolidated into `packages/core/async` so plugins share one implementation instead of hand-rolling their own event loops.
- **`pluginsdk` → `util` rename (2026-08-27):** the shared host↔plugin pub/sub constants package was renamed from `packages/core/pluginsdk` to `packages/core/util`.
