#!/usr/bin/env bash
set -euo pipefail

REPO="galacius/galacius"
BIN_NAME="galacius"
INSTALL_DIR="/usr/local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
# BIN_NAME/INSTALL_DIR are overridden below once PLATFORM_OS is known (see
# "detect OS + arch") -- Windows (Git Bash/MSYS2/Cygwin) has neither an
# /usr/local/bin nor an unsuffixed binary name.

# Base URL for all release lookups (releases/latest, releases/tags/{tag},
# releases/download/..., releases/assets/...). Mirrors GetReleasesBaseURL in
# internal/config/env.go — overridable via the same APP_VERSION_RELEASES_BASE_URL
# environment variable. Defaults to the public github.com host; if REPO is
# private and GALACIUS_ACCESS_TOKEN is required to access it, set this to
# https://api.github.com/repos/${REPO} instead (the public github.com host
# rejects Bearer tokens on private-repo release URLs).
RELEASES_BASE_URL="${APP_VERSION_RELEASES_BASE_URL:-https://github.com/${REPO}}"

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}→${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }
success() { echo -e "${GREEN}✓${NC} $*"; }

# sha256sum (coreutils) is present on Linux and Git-for-Windows/MSYS2; macOS
# has no coreutils by default and ships shasum instead -- prefer whichever is
# actually available rather than assuming one.
sha256_file() {
  if command -v sha256sum &>/dev/null; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum &>/dev/null; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    error "Neither sha256sum nor shasum found; cannot verify checksum."
  fi
}

# ── jq availability check ────────────────────────────────────────────────────
command -v jq &>/dev/null || error "jq is required but not installed. Install it and re-run."

# ── detect OS + arch ─────────────────────────────────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)
    case "$ARCH" in
      x86_64)  PLATFORM_OS="linux"; PLATFORM_ARCH="amd64" ;;
      *)        error "Unsupported Linux architecture: $ARCH" ;;
    esac
    ;;
  Darwin)
    case "$ARCH" in
      arm64)   PLATFORM_OS="darwin"; PLATFORM_ARCH="arm64" ;;
      x86_64)  PLATFORM_OS="darwin"; PLATFORM_ARCH="amd64" ;;
      *)        error "Unsupported macOS architecture: $ARCH" ;;
    esac
    ;;
  MINGW*|MSYS*|CYGWIN*)
    # Git Bash/MSYS2/Cygwin report a MINGW64_NT-.../MSYS_NT-.../CYGWIN_NT-...
    # kernel name via uname -s; only amd64 is in the build matrix (see
    # .github/workflows/job-build.yml's build-windows job).
    case "$ARCH" in
      x86_64)  PLATFORM_OS="windows"; PLATFORM_ARCH="amd64" ;;
      *)        error "Unsupported Windows architecture: $ARCH (only amd64 is currently published)" ;;
    esac
    ;;
  *)
    error "Unsupported OS: $OS"
    ;;
esac

if [[ "$PLATFORM_OS" == "windows" ]]; then
  BIN_NAME="galacius.exe"
  # $HOME is already the POSIX-style path Git Bash derives from %USERPROFILE%
  # (e.g. /c/Users/you), so joining it here needs no cygpath conversion.
  # Mirrors scripts/install.ps1's $env:LOCALAPPDATA\Programs\Galacius, so
  # either installer recognizes (and backs up) the other's install.
  INSTALL_DIR="$HOME/AppData/Local/Programs/Galacius"
fi

# ── auth ─────────────────────────────────────────────────────────────────────
# For private repos, export GALACIUS_ACCESS_TOKEN and also point
# RELEASES_BASE_URL at the API host (see its definition above) in
# ~/.bashrc or ~/.zshrc:
#   export GALACIUS_ACCESS_TOKEN=ghp_xxx
#   export APP_VERSION_RELEASES_BASE_URL=https://api.github.com/repos/galacius/galacius
GALACIUS_ACCESS_TOKEN="${GALACIUS_ACCESS_TOKEN:-}"

# HTTP/2 has stream teardown issues on some Linux curl builds; force HTTP/1.1
CURL_OPTS=()
[[ "$OS" == "Linux" ]] && CURL_OPTS+=(--http1.1)

gh_curl() {
  local args=(-sL "${CURL_OPTS[@]+"${CURL_OPTS[@]}"}")
  [[ -n "$GALACIUS_ACCESS_TOKEN" ]] && args+=(-H "Authorization: Bearer ${GALACIUS_ACCESS_TOKEN}")

  local tmp http_code body
  tmp=$(mktemp)
  http_code=$(curl "${args[@]}" -o "$tmp" -w "%{http_code}" "$@")
  body=$(cat "$tmp"); rm -f "$tmp"

  if [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
    # Surface GitHub's own explanation instead of guessing — a 401/403 can mean
    # an invalid/expired token, missing scopes, rate limiting, or an org policy
    # rejecting the token (e.g. fine-grained PAT lifetime limits), and each of
    # those needs a different fix.
    local gh_message
    gh_message=$(echo "$body" | grep -o '"message": *"[^"]*"' | head -1 | sed -E 's/"message": *"//; s/"$//')
    if [[ -n "$gh_message" ]]; then
      error "GitHub API returned $http_code: $gh_message"
    else
      error "GitHub API returned $http_code — token is invalid or missing required permissions."
    fi
  elif [[ "$http_code" == "404" ]]; then
    if [[ -z "$GALACIUS_ACCESS_TOKEN" ]]; then
      error "GitHub API returned 404 — check the repo name or that the release/tag exists.\nIf this is a private repo, export a token and the API base URL, then re-run:\n  export GALACIUS_ACCESS_TOKEN=ghp_xxx\n  export APP_VERSION_RELEASES_BASE_URL=https://api.github.com/repos/${REPO}"
    else
      error "GitHub API returned 404 — check the repo name or that the release/tag exists."
    fi
  elif [[ "$http_code" != "200" ]]; then
    error "GitHub API request failed with HTTP $http_code"
  fi

  echo "$body"
}

# ── setup temp directory ────────────────────────────────────────────────────
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# manifest.json is cached in ~/.galacius (same location internal/updater
# persists it to) rather than TMP_DIR, so it survives past this run for
# inspection/debugging instead of being deleted on exit.
GALACIUS_DIR="$HOME/.galacius"
mkdir -p "$GALACIUS_DIR"
MANIFEST_PATH="$GALACIUS_DIR/manifest.json"

# ── resolve version ───────────────────────────────────────────────────────────
# Priority: positional arg > VERSION env var > latest release
VERSION="${1:-${VERSION:-}}"

if [[ -n "$VERSION" ]]; then
  TAG="$VERSION"
  info "Installing version: $TAG"
elif [[ -n "$GALACIUS_ACCESS_TOKEN" ]]; then
  info "Fetching latest release..."
  # The trailing `|| true` keeps a no-match `grep` from tripping `pipefail`
  # and silently killing the script via `set -e` before the explicit check
  # below ever runs — without it, a bad response (e.g. GALACIUS_ACCESS_TOKEN
  # set but RELEASES_BASE_URL still pointing at the HTML host instead of the
  # API) exits with zero output instead of the error message.
  TAG=$(gh_curl "${RELEASES_BASE_URL}/releases/latest" \
    | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/') || true
  [[ -z "$TAG" ]] && error "Could not resolve latest release. If GALACIUS_ACCESS_TOKEN is set, make sure APP_VERSION_RELEASES_BASE_URL also points at the GitHub API host (e.g. https://api.github.com/repos/${REPO}) — the plain github.com host returns HTML, not the JSON this expects."
  info "Latest version: $TAG"
else
  # Public repo, no token: resolve the latest tag via the releases page
  # redirect instead of the GitHub API. The unauthenticated API is capped at
  # 60 requests/hour *per source IP*, which is shared by everyone behind the
  # same NAT/office network/CI runner pool — easy to exhaust without ever
  # having made 60 requests yourself, and it fails with a 403 that looks
  # identical to a bad token. The releases page redirect isn't rate-limited.
  info "Fetching latest release..."
  FINAL_URL=$(curl -fsSL "${CURL_OPTS[@]+"${CURL_OPTS[@]}"}" -o /dev/null -w '%{url_effective}' \
    "${RELEASES_BASE_URL}/releases/latest") \
    || error "Could not reach ${RELEASES_BASE_URL}/releases/latest"
  TAG="${FINAL_URL##*/tag/}"
  [[ -z "$TAG" || "$TAG" == "$FINAL_URL" ]] && error "Could not resolve latest release for ${REPO}."
  info "Latest version: $TAG"
fi

# ── resolve release metadata + manifest ───────────────────────────────────────
# manifest.json is the single source of truth for the artifact filename and
# SHA256 checksum for each platform — generated from the actual build matrix
# output, avoiding hardcoded per-platform guesses drifting from what was built.
RELEASE_JSON=""
ASSET_ID=""
if [[ -n "$GALACIUS_ACCESS_TOKEN" ]]; then
  info "Resolving release..."
  RELEASE_JSON=$(gh_curl "${RELEASES_BASE_URL}/releases/tags/${TAG}")

  # Extract asset id — tracks last seen "id" value, stops at matching "name"
  MANIFEST_ASSET_ID=$(echo "$RELEASE_JSON" | awk -v art="manifest.json" '
    /"id":/ { id=$0; gsub(/[^0-9]/, "", id); last_id=id }
    /"name":/ && index($0, art) { print last_id; exit }
  ')
  [[ -z "$MANIFEST_ASSET_ID" ]] && error "manifest.json not found in release ${TAG}. Check the tag name and repo."

  curl -fsSL "${CURL_OPTS[@]+"${CURL_OPTS[@]}"}" \
    -H "Authorization: Bearer ${GALACIUS_ACCESS_TOKEN}" \
    -H "Accept: application/octet-stream" \
    "${RELEASES_BASE_URL}/releases/assets/${MANIFEST_ASSET_ID}" \
    -o "$MANIFEST_PATH" \
    || error "Could not download manifest for release ${TAG}."
else
  info "Resolving asset from manifest..."
  curl -fsSL "${CURL_OPTS[@]+"${CURL_OPTS[@]}"}" \
    "${RELEASES_BASE_URL}/releases/download/${TAG}/manifest.json" \
    -o "$MANIFEST_PATH" \
    || error "Could not download manifest for release ${TAG}."
fi

# Use --arg to pass PLATFORM_OS/PLATFORM_ARCH as JSON strings to jq, preventing
# injection if these values were ever derived from untrusted sources.
ARTIFACT=$(jq -r --arg os "$PLATFORM_OS" --arg arch "$PLATFORM_ARCH" \
  '.artifacts[] | select(.os == $os and .arch == $arch) | .filename' \
  "$MANIFEST_PATH")
[[ -z "$ARTIFACT" || "$ARTIFACT" == "null" ]] && \
  error "Platform ${PLATFORM_OS}/${PLATFORM_ARCH} not found in release manifest for ${TAG}."

EXPECTED_SHA256=$(jq -r --arg os "$PLATFORM_OS" --arg arch "$PLATFORM_ARCH" \
  '.artifacts[] | select(.os == $os and .arch == $arch) | .sha256' \
  "$MANIFEST_PATH")
[[ -z "$EXPECTED_SHA256" || "$EXPECTED_SHA256" == "null" ]] && \
  error "No SHA256 checksum in release manifest for ${PLATFORM_OS}/${PLATFORM_ARCH}; refusing to install an unverified binary."

# ── resolve asset ID (required for private repo downloads only) ──────────────
# Public downloads use direct github.com/.../releases/download URLs below and
# never need the API, so skip this (and its share of the rate limit) entirely
# when there's no token.
if [[ -n "$GALACIUS_ACCESS_TOKEN" ]]; then
  ASSET_ID=$(echo "$RELEASE_JSON" | awk -v art="$ARTIFACT" '
    /"id":/ { id=$0; gsub(/[^0-9]/, "", id); last_id=id }
    /"name":/ && index($0, art) { print last_id; exit }
  ')

  [[ -z "$ASSET_ID" ]] && error "Asset '${ARTIFACT}' not found in release ${TAG}. Check the tag name and repo."
fi

# ── backup current installation ─────────────────────────────────────────────
# Snapshot whatever's currently installed before touching anything, so a
# failed/corrupt download leaves the user with a working app instead of a
# half-installed one. Restored on any download/checksum failure below;
# discarded once the new artifact is verified good.
if [[ "$OS" == "Darwin" ]]; then
  CURRENT_INSTALL="/Applications/Galacius.app"
else
  CURRENT_INSTALL="$INSTALL_DIR/$BIN_NAME"
fi
BACKUP_PATH="$TMP_DIR/backup.$(basename "$CURRENT_INSTALL")"
HAVE_BACKUP=0

if [[ -e "$CURRENT_INSTALL" ]]; then
  info "Backing up current installation..."
  if [[ -w "$CURRENT_INSTALL" || -w "$(dirname "$CURRENT_INSTALL")" ]]; then
    cp -a "$CURRENT_INSTALL" "$BACKUP_PATH"
  else
    sudo cp -a "$CURRENT_INSTALL" "$BACKUP_PATH"
  fi
  HAVE_BACKUP=1
fi

restore_backup() {
  [[ "$HAVE_BACKUP" -eq 1 ]] || return
  warn "Restoring previous installation..."
  if [[ -w "$CURRENT_INSTALL" || -w "$(dirname "$CURRENT_INSTALL")" ]]; then
    rm -rf "$CURRENT_INSTALL"
    cp -a "$BACKUP_PATH" "$CURRENT_INSTALL"
  else
    sudo rm -rf "$CURRENT_INSTALL"
    sudo cp -a "$BACKUP_PATH" "$CURRENT_INSTALL"
  fi
  warn "Previous installation restored"
}

# ── download ─────────────────────────────────────────────────────────────────
info "Downloading $ARTIFACT..."
DOWNLOAD_OK=1
if [[ -n "$GALACIUS_ACCESS_TOKEN" ]]; then
  # Private repo: use the GitHub API assets endpoint with Accept: application/octet-stream
  curl -fsSL "${CURL_OPTS[@]+"${CURL_OPTS[@]}"}" --progress-bar \
    -H "Authorization: Bearer ${GALACIUS_ACCESS_TOKEN}" \
    -H "Accept: application/octet-stream" \
    "${RELEASES_BASE_URL}/releases/assets/${ASSET_ID}" \
    -o "$TMP_DIR/$ARTIFACT" || DOWNLOAD_OK=0
else
  # Public repo: direct download URL
  curl -fsSL "${CURL_OPTS[@]+"${CURL_OPTS[@]}"}" --progress-bar \
    "${RELEASES_BASE_URL}/releases/download/${TAG}/${ARTIFACT}" \
    -o "$TMP_DIR/$ARTIFACT" || DOWNLOAD_OK=0
fi

if [[ "$DOWNLOAD_OK" -eq 0 ]]; then
  restore_backup
  error "Could not download ${ARTIFACT} for release ${TAG}. Check the tag name and repo."
fi

# ── verify checksum ──────────────────────────────────────────────────────────
# Verified against the SHA256 already resolved from manifest.json above —
# fail-closed behavior (refusing to install without a checksum) is enforced
# where EXPECTED_SHA256 is read from the manifest.
info "Verifying checksum..."
ACTUAL_SHA256=$(sha256_file "$TMP_DIR/$ARTIFACT")
if [[ "$EXPECTED_SHA256" != "$ACTUAL_SHA256" ]]; then
  restore_backup
  error "Checksum mismatch for ${ARTIFACT}: expected ${EXPECTED_SHA256}, got ${ACTUAL_SHA256}"
fi
success "Checksum verified"

# Download verified good — the backup has served its purpose.
if [[ "$HAVE_BACKUP" -eq 1 ]]; then
  rm -rf "$BACKUP_PATH"
fi

# ── extract ──────────────────────────────────────────────────────────────────
# The Windows artifact ships as a bare .exe (no archive), so neither case
# matches and the downloaded file is already the binary.
info "Extracting..."
case "$ARTIFACT" in
  *.tar.gz) tar -xzf "$TMP_DIR/$ARTIFACT" -C "$TMP_DIR" ;;
  *.zip)    unzip -q "$TMP_DIR/$ARTIFACT" -d "$TMP_DIR" ;;
esac

# ── install binary ───────────────────────────────────────────────────────────
if [[ "$OS" == "Darwin" ]]; then
  APP_SRC=$(find "$TMP_DIR" -name "galacius.app" -maxdepth 3 | head -1)
  [[ -z "$APP_SRC" ]] && error "galacius.app not found in archive"

  APP_DEST="/Applications/Galacius.app"
  info "Installing to $APP_DEST..."
  rm -rf "$APP_DEST"
  cp -r "$APP_SRC" "$APP_DEST"

  info "Applying ad-hoc code signature..."
  xattr -cr "$APP_DEST"
  codesign --force --deep --sign - "$APP_DEST"

  ln -sf "$APP_DEST/Contents/MacOS/galacius" "$INSTALL_DIR/$BIN_NAME" 2>/dev/null || true

  success "Galacius installed to $APP_DEST"
  echo "  Open from Applications or run: open /Applications/Galacius.app"

elif [[ "$PLATFORM_OS" == "windows" ]]; then
  info "Installing to $INSTALL_DIR/$BIN_NAME..."
  mkdir -p "$INSTALL_DIR"

  STAGED="$INSTALL_DIR/.$BIN_NAME.new"
  cp "$TMP_DIR/$ARTIFACT" "$STAGED"
  mv -f "$STAGED" "$INSTALL_DIR/$BIN_NAME"

  # A PATH change here only reaches Git Bash sessions, not cmd.exe/PowerShell
  # -- scripts/install.ps1 is the native Windows install that also wires up
  # the system-wide user PATH and a Start Menu shortcut.
  BASHRC="$HOME/.bashrc"
  PATH_LINE="export PATH=\"$INSTALL_DIR:\$PATH\""
  if [[ ! -f "$BASHRC" ]] || ! grep -qF "$PATH_LINE" "$BASHRC"; then
    printf '\n# Added by galacius install.sh\n%s\n' "$PATH_LINE" >> "$BASHRC"
    warn "Added $INSTALL_DIR to PATH in ~/.bashrc — restart Git Bash (or run: source ~/.bashrc) to use the 'galacius' command"
  fi

  success "Galacius $TAG installed to $INSTALL_DIR/$BIN_NAME"
  echo "  Run from Git Bash: galacius"
  echo "  For a full Windows install (Start Menu shortcut + system PATH), use scripts/install.ps1 instead"

else
  BIN_SRC=$(find "$TMP_DIR" -name "$BIN_NAME" -type f | head -1)
  [[ -z "$BIN_SRC" ]] && error "Binary not found in archive"

  info "Installing to $INSTALL_DIR/$BIN_NAME..."
  # Copy to a staging file in the same directory, then rename it into place.
  # rename(2) is atomic and doesn't touch the destination's inode, so a
  # currently-running $BIN_NAME (e.g. self-update) keeps executing the old
  # inode instead of hitting "text file busy" or a truncated binary from
  # an in-place cp/write.
  STAGED="$INSTALL_DIR/.$BIN_NAME.new"
  if [[ -w "$INSTALL_DIR" ]]; then
    cp "$BIN_SRC" "$STAGED"
    chmod +x "$STAGED"
    mv -f "$STAGED" "$INSTALL_DIR/$BIN_NAME"
  else
    sudo cp "$BIN_SRC" "$STAGED"
    sudo chmod +x "$STAGED"
    sudo mv -f "$STAGED" "$INSTALL_DIR/$BIN_NAME"
  fi

  # Install the helper binary if present (non-blocking; skip gracefully if missing,
  # e.g. older releases that predate the helper).
  HELPER_SRC=$(find "$TMP_DIR" -name "galacius-install-helper" -type f | head -1)
  if [[ -n "$HELPER_SRC" ]]; then
    HELPER_NAME="galacius-install-helper"
    HELPER_STAGED="$INSTALL_DIR/.$HELPER_NAME.new"
    if [[ -w "$INSTALL_DIR" ]]; then
      cp "$HELPER_SRC" "$HELPER_STAGED"
      chmod +x "$HELPER_STAGED"
      mv -f "$HELPER_STAGED" "$INSTALL_DIR/$HELPER_NAME"
    else
      sudo cp "$HELPER_SRC" "$HELPER_STAGED"
      sudo chmod +x "$HELPER_STAGED"
      sudo mv -f "$HELPER_STAGED" "$INSTALL_DIR/$HELPER_NAME"
    fi
  else
    echo "⚠ galacius-install-helper not found in release archive; auto-update will be unavailable until reinstalled from a release that includes it" >&2
  fi

  # ── system dependencies (Debian/Ubuntu only) ─────────────────────────────
  if command -v dpkg &>/dev/null && [[ -f /etc/os-release ]]; then
    . /etc/os-release
    if [[ "$ID" == "ubuntu" || "$ID" == "debian" || "$ID_LIKE" == *"ubuntu"* || "$ID_LIKE" == *"debian"* ]]; then
      MISSING_PKGS=()
      for pkg in libgtk-3-0 libwebkit2gtk-4.1-0; do
        if ! dpkg -s "$pkg" &>/dev/null 2>&1; then
          MISSING_PKGS+=("$pkg")
        fi
      done
      if [[ ${#MISSING_PKGS[@]} -gt 0 ]]; then
        info "Installing missing dependencies: ${MISSING_PKGS[*]}"
        sudo apt-get update -qq
        if ! sudo apt-get install -y "${MISSING_PKGS[@]}"; then
          warn "apt-get install failed for: ${MISSING_PKGS[*]}"
          if [[ " ${MISSING_PKGS[*]} " == *" libwebkit2gtk-4.1-0 "* ]]; then
            warn "Attempting libwebkit2gtk-4.0-37 fallback (Ubuntu 22.04 and earlier do not package 4.1)..."
            sudo apt-get install -y libwebkit2gtk-4.0-37 || warn "libwebkit2gtk-4.0-37 fallback also failed; app may not run"
          fi
        else
          success "System dependencies installed"
        fi
      else
        success "System dependencies already installed"
      fi
    fi
  fi

  # ── icon (Linux) ──────────────────────────────────────────────────────────
  ICON_SRC=$(find "$TMP_DIR" -name "appicon.png" -type f | head -1)
  if [[ -n "$ICON_SRC" ]]; then
    # Kept in ~/.galacius (the single on-disk dir for all persistent app
    # data — see internal/storage) alongside the themed copy below, so the
    # icon lives in one place uninstall/cleanup tooling already knows about.
    cp "$ICON_SRC" "$GALACIUS_DIR/appicon.png"

    ICON_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"
    mkdir -p "$ICON_DIR"
    cp "$ICON_SRC" "$ICON_DIR/galacius.png"
    if command -v gtk-update-icon-cache &>/dev/null; then
      gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
    fi
  fi

  # ── desktop entry (Linux) ─────────────────────────────────────────────────
  mkdir -p "$DESKTOP_DIR"
  cat > "$DESKTOP_DIR/galacius.desktop" << EOF
[Desktop Entry]
Name=Galacius
Comment=Kubernetes Cluster Manager
Exec=$INSTALL_DIR/$BIN_NAME
Icon=galacius
Type=Application
Categories=Development;Network;
StartupNotify=true
EOF

  if command -v update-desktop-database &>/dev/null; then
    update-desktop-database "$DESKTOP_DIR"
  fi

  success "Galacius $TAG installed to $INSTALL_DIR/$BIN_NAME"
  echo "  Run from terminal: galacius"
  echo "  Or find it in your application launcher"
fi
