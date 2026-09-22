---
name: go-work-removal-todo
description: root go.work was removed for good (no go.work file), but a bare `replace` directive for packages/core in go.mod is now a permanent, intentional part of the architecture — not a shim to remove
metadata:
  node_type: memory
  type: project
  originSessionId: d92fb7a1-c0a5-4c8c-9225-630bbe759b97
  modified: 2026-08-21T16:51:27.971Z
---

CURRENT STATE (2026-08-21, branch `chore/remove-go-work-shim`): root `go.mod` has `replace github.com/galacius/galacius/packages/core => ./packages/core`, permanently — this is intentional, not a temporary shim to remove before merge. No root `go.work`/`go.work.sum` file exists or is planned; the bare `replace` line is sufficient and simpler.

**Why this is correct, not a regression:** `packages/core` is the host's own extension surface — same role as `@galacius/core` on the frontend, which the frontend resolves via pnpm `workspace:*` (always local source, no version pin). Host and `packages/core` ship from the same commit, so the version pin in `require github.com/galacius/galacius/packages/core vX.Y.Z` is decorative for the host build; `replace` makes the host always build against local `packages/core` source, matching the frontend pattern. Confirmed via `go build ./...`, `go vet ./internal/...`, `go test -race ./internal/...` — all pass with the replace directive present.

**What still needs real tags:** external plugin repos (e.g. `galacius-plugins`) are the actual consumers of pinned `packages/core/vX.Y.Z` releases — they don't get the `replace` directive, so tags must still be cut whenever plugin-facing surface (`pb`, `dto`, `kube.LoadingRules`) changes, to keep plugins buildable against a real published version. The `require` line's version number in the host's `go.mod` should still be bumped opportunistically to stay close to the latest tag (keeps `go.sum`/`go mod tidy` sane and avoids the pin drifting to something ancient), but it no longer gates host builds the way it did right after the original go.work removal.

Original history: root `go.work` was deleted (2026-08-21 earlier same day) once `packages/core/v1.7.0` was tagged, moving `internal/` to a normal pinned dependency — this was itself the removal of an interim mechanism from Phase 4 of [[plugin-architecture-inversion]] (before any tag existed, `go.work` substituted the on-disk directory so `go build ./internal/...` could resolve `packages/core` at all). The bare `replace` directive reintroduced here is a distinct, smaller mechanism (no `go.work` file) chosen deliberately for the host↔core pairing, not a reversion to the old go.work setup.

**Gotcha (2026-09-22): `go get -u` drifts `k8s.io/kube-openapi` off the version client-go/apimachinery actually want.** `kube-openapi` has no tagged releases (date-based pseudo-versions only), so a blanket upgrade jumps it to the latest commit instead of whatever `client-go`/`apimachinery`/`api` were tested against — newer `kube-openapi` commits switched `schemaconv` to `sigs.k8s.io/structured-merge-diff/v7` while `apimachinery` still expects `/v6`, breaking the build. Fix: `scripts/fix-go-mod-transitive-pins.sh` drops the explicit `require` for `kube-openapi` in both modules and re-runs `go mod tidy` so MVS recomputes it from what `client-go` et al. actually require — run it on `packages/core` **before** root (root's `replace` directive inherits core's resolution, so fixing root first just re-inherits the stale pin). Run this after any `go get -u`/dependency bump touching the k8s.io module family.
