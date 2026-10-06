# macOS Menu Bar Tray (Status Item)

**Date added:** 2026-10-06

## Overview

Galacius on macOS displays a native menu-bar status item (NSStatusItem) in the top-right status bar. This allows users to:

- Quickly access the app from the menu bar
- Keep the app running in the background while hiding the window (close button hides, not quits)
- Access quick shortcuts: Open, Settings, About, Quit

## Architecture

### Package: `internal/tray`

A **leaf package** with **zero dependencies** on app, wails, config, or kube.

- **`tray.go`** — pure Go
  - `Handlers` struct: callbacks for Open, Settings, About, Quit
  - `SetHandlers(h Handlers)` — stores handlers once
  - `dispatch(tag int)` — async dispatcher (via `go fn()`) that maps tag→handler, ignores nil/unknown
  - Constants: `ItemOpen=1, ItemSettings=2, ItemAbout=3, ItemQuit=4`

- **`tray_darwin.go`** (cgo, `//go:build darwin`)
  - Calls C functions `GLCStartTray(png, len)` and `GLCStopTray()`
  - Embeds `assets/trayTemplate.png` (36×36 px, black silhouette on transparent)
  - Exports Go func `galaciusTrayItemClicked(tag C.int)` → calls `dispatch(tag)`
  - `Start(handlers Handlers) error` — idem potent
  - `Stop() error`
  - Const `Supported = true`

- **`tray_darwin.m`** (Objective-C, no ARC)
  - Class `GLCTrayTarget` — NSObject with `onItem:` selector
  - Statics: `statusItem` (NSStatusItem, retained), `trayTarget` (GLCTrayTarget, retained)
  - `GLCStartTray(png, len)` — dispatch_async(main queue)
    - Idempotent: no-op if already created
    - Create NSStatusItem, load PNG icon, set template mode (black silhouette + alpha)
    - Create NSMenu with 5 items + separator, attach to statusItem
  - `GLCStopTray()` — dispatch_async(main queue)
    - Remove statusItem from NSStatusBar, release statics

- **`tray_linux.go`** (`//go:build linux`, pure Go, no cgo)
  - StatusNotifierItem over D-Bus via `fyne.io/systray` (`RunWithExternalLoop`, so it coexists with Wails' GTK loop)
  - `Available()` = `org.kde.StatusNotifierWatcher` has an owner on the session bus (Pop!_OS/GNOME AppIndicator extension, KDE, COSMIC); otherwise false so the red X still quits
  - White icon `assets/trayLinux.png` (64px; no template tinting on Linux, panels are dark); source `build/tray/trayLinux.svg`
  - Library can only start once per process: `Start` is once-only, `Stop` ends it for good

- **`tray_other.go`** (`//go:build !darwin && !linux`)
  - No-op `Start()` and `Stop()`; `Available()` is false (Windows has no tray yet)

- **`tray_test.go`**
  - Table-driven tests: dispatch calls right handler per tag (async via channels/WaitGroup)
  - Unknown tags and nil handlers ignored without panic
  - Dispatch returns immediately (async)
  - Concurrent safety check (race-detector)

### Lifecycle: `internal/app`

**`app.go`**
- Imports `internal/tray`
- `Startup()` calls `a.startTray()` as final line (after a.ctx is set)
- `Shutdown()` calls `tray.Stop()` as first line

**`app/tray.go`** (new file)
- `startTray()` wires handlers:
  - OnOpen → `showMainWindow()`
  - OnSettings → `showMainWindow()` + `a.OpenSettings()`
  - OnAbout → `showMainWindow()` + `a.OpenAbout()`
  - OnQuit → `a.Quit()`
- `showMainWindow()` (unexported, not Wails-bound)
  - No-op if a.ctx == nil
  - Calls runtime.Show, runtime.WindowUnminimise, runtime.WindowShow

### Main app config: `main.go`

```go
HideWindowOnClose: tray.Available(),  // macOS: true; Linux: true if a tray host is running; else false
```

- On Darwin, red X (close button) hides window instead of quitting
- Cmd+Q, tray "Quit App" item, or direct `runtime.Quit` calls still quit the app
- On Linux it is true only when a tray host exists; on Windows it is false, so red X quits as usual

## Design decisions

### Leaf package (zero imports of app/wails/config/kube)

Keeps the tray layer decoupled from the app. Handlers are function pointers; the package doesn't know or care what they do. This makes it testable in isolation and reusable if the app architecture changes.

### Idempotent Start

`tray_darwin.m` is idempotent (checked via `if (statusItem != nil) return`). Calling `Start()` twice is safe — the second call does nothing. This tolerates restarts or re-initialization.

### Async dispatch via `go fn()`

All handler callbacks run async (in a new goroutine) to avoid deadlocking the Objective-C main thread when a handler makes a Wails runtime call (e.g., `runtime.Show`). The callback itself runs on the ObjC main queue; if we called a Wails API directly, the IPC handshake could hang waiting for the UI thread.

### No OnBeforeClose hook

The plan explicitly does **not** use Wails' `OnBeforeClose` hook. Instead, it sets `HideWindowOnClose: true` in options, which is simpler and more direct. `OnBeforeClose` is left unused.

### No changes to app menu or NSApp.delegate

The tray is independent of the Wails-managed app menu (in `main.go` buildMenu). No custom NSApp delegate is needed; the tray is a separate, lightweight status item that can coexist.

### Icon: simplified container-ship silhouette

36×36 px PNG, pure black on transparent (alpha). Macros uses this as a 2x template for 18×18 display in the status bar. The silhouette mirrors the brand logo (container-ship from `build/appicon.png`).

## Testing

`internal/tray/tray_test.go` covers:

- ✅ Dispatch calls the correct handler per tag
- ✅ Unknown tags ignored without panic
- ✅ Nil handlers ignored without panic
- ✅ Dispatch returns immediately (handler runs async)
- ✅ Concurrent dispatch calls are safe (race detector passes)
- ✅ Start/Stop are idempotent (no panic on repeat calls)
- ✅ Available() true on darwin / false on unsupported OSes (build-tag tests); no panic on Linux

All 11 tests pass with `-race`.

## Verification

On macOS:
- Tray icon appears in top-right status bar (simplified container-ship silhouette)
- Click "Open Galacius" → window shows/activates
- Click "Settings" → window shows + settings drawer opens
- Click "About Galacius" → window shows + about modal opens
- Click "Quit App" → app quits cleanly (tray.Stop called first)
- Red X (close button) hides window; app continues running in tray

On Linux (Pop!_OS / GNOME with AppIndicator): white ship icon appears in the top bar with the same 5-item menu; red X hides, Open/Quit behave as on macOS. Without a tray host, `Available()` is false and red X quits. Needs manual check on a real desktop.

On Windows:
- `tray.Available()` is false, `HideWindowOnClose` is false, red X quits normally

## Code patterns

### Objective-C patterns used

- No ARC (Manual memory management with retain/release)
- GLC prefix on custom classes (to avoid conflicts with Wails' own Objective-C classes)
- dispatch_async(main queue) for all Cocoa calls (idiomatic for Wails integration)
- Blocks for inline GCD code (brief, readable)
- NSData/NSImage for binary asset handling

### Go patterns used

- sync.Once to guard one-time handler setup
- sync.Mutex for handlers map access
- Table-driven tests
- Build tags (`//go:build darwin` vs `//go:build !darwin`)
- Minimal imports (no runtime, no wails in the package itself)

## Related files

- `.claude/memory/unified_tray_architecture.md` — unrelated; documents the bottom app tray system (plugin tray registry)
- `internal/app/fullscreen_darwin.go/m` — sister pattern for enabling fullscreen button
- `build/appicon.png` — logo inspiration for tray icon
