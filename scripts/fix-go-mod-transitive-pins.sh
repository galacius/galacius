#!/usr/bin/env bash
# k8s.io/kube-openapi has no tagged releases (pure date-based pseudo-versions),
# so `go get -u` always jumps it to the latest commit instead of the version
# k8s.io/client-go (and friends) actually depend on and were tested against.
# That drift breaks the build: newer kube-openapi commits have switched
# schemaconv to sigs.k8s.io/structured-merge-diff/v7, while k8s.io/apimachinery
# still expects /v6, so apimachinery fails to compile.
#
# Fix: drop our explicit require for kube-openapi after every upgrade and let
# `go mod tidy` recompute it via MVS from what client-go/apimachinery/api
# actually require — the version pairing upstream tested.
set -euo pipefail

fix_module() {
  local dir="$1"
  go -C "$dir" mod edit -droprequire=k8s.io/kube-openapi
  go mod tidy -C "$dir"
}

# packages/core first: the root module's `replace` directive points at this
# local checkout, so root's MVS resolution inherits whatever core currently
# requires — fixing root before core just re-inherits core's stale pin.
fix_module "packages/core"
fix_module "."
