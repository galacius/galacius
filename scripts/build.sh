#!/usr/bin/env bash
set -euo pipefail

args=("$@")
# pnpm forwards a literal `--` from `pnpm build:app -- ...` invocations; wails build
# treats `--` as end-of-flags and silently drops everything after it, so strip it here.
if [[ "${args[0]:-}" == "--" ]]; then
  args=("${args[@]:1}")
fi

# Run wails build, forwarding any extra flags (e.g. -ldflags "-X main.Version=v1.0.0")
# "${args[@]+"${args[@]}"}" avoids "unbound variable" under set -u when args is
# empty, since bash <4.4 (e.g. macOS's stock /bin/bash 3.2) treats "${args[@]}"
# on an empty array as unset rather than an empty expansion.
go tool wails build "${args[@]+"${args[@]}"}"

# Linux: build the install-helper binary
if [[ "$(uname)" == "Linux" ]]; then
  echo "→ Building galacius-install-helper..."
  go build -ldflags "-s -w" -trimpath -o build/bin/galacius-install-helper ./cmd/galacius-install-helper
  echo "✓ galacius-install-helper built"
fi

# macOS: remove quarantine flag and apply ad-hoc signature so Gatekeeper doesn't block the app
if [[ "$(uname)" == "Darwin" ]]; then
  APP="build/bin/galacius.app"
  if [[ -d "$APP" ]]; then
    echo "→ Removing quarantine attribute..."
    xattr -cr "$APP"
    echo "→ Applying ad-hoc code signature..."
    codesign --force --deep --sign - "$APP"
    echo "✓ $APP is ready to run"
  fi
fi
