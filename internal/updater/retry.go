package updater

import (
	"errors"
	"log"
	"time"

	"github.com/galacius/galacius/internal/lib/ratelimiter"
)

// RetryBackoffSchedule is the sleep schedule retryRelease applies between
// attempts. Exported so tests can shrink it — at the production values
// (5s, 10s), a single exhausted-retries test takes 15s, and tests that
// exercise retryRelease from higher up the stack (FetchRelease, App's
// checkForUpdate) pay the same cost again.
var RetryBackoffSchedule = []time.Duration{5 * time.Second, 10 * time.Second}

// retryRelease wraps a function that fetches a Release with retry logic.
// It attempts up to 3 times with backoff (RetryBackoffSchedule between
// attempts), but short-circuits immediately on rate-limit errors. The sleep
// schedule is only applied between attempts that will actually happen (no
// sleep after the final attempt).
func retryRelease(fn func() (*Release, error)) (*Release, error) {
	var rel *Release
	var err error
	sleeps := RetryBackoffSchedule
	for attempt := range 3 {
		rel, err = fn()
		if err == nil {
			return rel, nil
		}
		// Short-circuit on rate-limit errors; don't retry
		if _, ok := errors.AsType[*ratelimiter.RateLimitError](err); ok {
			log.Printf("updater: retryRelease: rate limited: %v", err)
			return nil, err
		}
		// Non-rate-limit failure; log and retry if we have attempts left
		log.Printf("updater: retryRelease: attempt %d: %v", attempt+1, err)
		if attempt < len(sleeps) {
			time.Sleep(sleeps[attempt])
		}
	}
	return nil, err
}
