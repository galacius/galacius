//go:build linux || windows

package tray

import (
	"log"
	"sync"

	"fyne.io/systray"
)

var (
	stateMu sync.Mutex
	started bool
	endFn   func()
)

// Start registers the status item via fyne.io/systray (pure Go: D-Bus on Linux,
// Win32 on Windows, each with its own loop, so it coexists with Wails' main
// loop). Only the first call has an effect for the process lifetime; later
// calls just replace the handlers.
func Start(h Handlers) {
	SetHandlers(h)

	stateMu.Lock()
	defer stateMu.Unlock()
	if started {
		return
	}
	started = true

	start, end := systray.RunWithExternalLoop(onReady, nil)
	endFn = end
	go start()
}

// Stop unregisters the status item. The underlying library can only be
// started once per process, so Start is a no-op afterwards.
func Stop() {
	stateMu.Lock()
	end := endFn
	endFn = nil
	stateMu.Unlock()

	if end == nil {
		return
	}
	defer func() {
		if r := recover(); r != nil {
			log.Printf("tray: stop: %v", r)
		}
	}()
	end()
}

func onReady() {
	systray.SetIcon(trayIcon())
	systray.SetTitle("Galacius")
	systray.SetTooltip("Galacius")
	platformSetup()

	for _, it := range []struct {
		tag   int
		title string
	}{
		{ItemOpen, "Open Galacius"},
		{ItemSettings, "Settings"},
		{ItemAbout, "About Galacius"},
		{-1, ""},
		{ItemQuit, "Quit App"},
	} {
		if it.tag < 0 {
			systray.AddSeparator()
			continue
		}
		item := systray.AddMenuItem(it.title, "")
		go func(tag int) {
			for range item.ClickedCh {
				dispatch(tag)
			}
		}(it.tag)
	}
}
