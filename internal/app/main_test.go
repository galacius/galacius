package app

import (
	"os"
	"testing"
	"time"

	"github.com/galacius/galacius/internal/updater"
)

// TestMain stubs the updater package's Homebrew-managed-install probe for the
// whole package test run so checkForUpdate/CheckForUpdate tests aren't
// coupled to the real test machine's actual Homebrew/Caskroom state (a dev
// machine with galacius installed via `brew install` would otherwise make
// updater.Check short-circuit before ever reaching the mock release server).
//
// It also shrinks updater.RetryBackoffSchedule (production: 5s, 10s) — this
// package's checkForUpdate retry-exhaustion tests otherwise take 15s each.
func TestMain(m *testing.M) {
	restoreHomebrew := updater.SetCheckHomebrewManagedForTest(func() bool { return false })
	updater.RetryBackoffSchedule = []time.Duration{time.Millisecond, time.Millisecond}
	code := m.Run()
	restoreHomebrew()
	os.Exit(code)
}
