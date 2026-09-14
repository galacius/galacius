#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'; NC='\033[0m'
success() { echo -e "${GREEN}✓${NC} $*"; }

OS="$(uname -s)"
CLEANUP=false

for arg in "$@"; do
  case "$arg" in
    cleanup)
      CLEANUP=true
      ;;
  esac
done

if [[ "$OS" == "Darwin" ]]; then
  rm -rf /Applications/Galacius.app
  rm -f /usr/local/bin/galacius
  success "Galacius removed"
else
  sudo rm -f /usr/local/bin/galacius
  rm -f "$HOME/.local/share/applications/galacius.desktop"
  if command -v update-desktop-database &>/dev/null; then
    update-desktop-database "$HOME/.local/share/applications"
  fi
  success "Galacius removed"
fi

if [[ "$CLEANUP" == "true" ]]; then
  # All Galacius app data (settings.json, plugins) now lives under ~/.galacius.
  # Also remove old settings location for thoroughness.
  APP_DATA_DIR="$HOME/.galacius"

  # Remove old settings location (OS-specific config dir)
  case "$OS" in
    Darwin)
      rm -rf "$HOME/Library/Application Support/galacius"
      ;;
    *)
      rm -rf "${XDG_CONFIG_HOME:-$HOME/.config}/galacius"
      ;;
  esac

  # Remove consolidated app data directory
  rm -rf "$APP_DATA_DIR"
  success "Galacius persistent data removed"
fi
