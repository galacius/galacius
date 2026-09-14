package updater

import (
	"testing"
	"time"
)

// TestMain stubs checkHomebrewManaged for the whole package test run so
// Check()'s tests aren't coupled to the actual test machine's real
// Homebrew/Caskroom state (see the checkHomebrewManaged doc comment).
// isHomebrewInstalled itself is still exercised directly and unaffected,
// since its tests call it with injected statFn/findBrew/checkBrewList
// functions rather than going through this override.
//
// It also shrinks RetryBackoffSchedule: at the production values (5s, 10s),
// tests exercising an exhausted retry loop take 15s each, and this package
// has several — real backoff timing isn't what these tests are verifying.
func TestMain(m *testing.M) {
	checkHomebrewManaged = func() bool { return false }
	RetryBackoffSchedule = []time.Duration{time.Millisecond, time.Millisecond}
	m.Run()
}
