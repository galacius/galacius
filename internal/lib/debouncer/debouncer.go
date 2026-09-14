package debouncer

import (
	"sync"
	"time"
)

// DefaultDebounceInterval is the standard debounce window used for informer event handlers.
const DefaultDebounceInterval = 200 * time.Millisecond

type Debouncer struct {
	mu         sync.Mutex
	timer      *time.Timer
	pending    string
	interval   time.Duration
	fn         func(string)
	activeFn   func() bool
	stopped    bool
	generation int64
}

func NewDebouncer(interval time.Duration, fn func(string), activeFn func() bool) *Debouncer {
	return &Debouncer{interval: interval, fn: fn, activeFn: activeFn}
}

func (d *Debouncer) Trigger(ns string) {
	d.mu.Lock()
	if d.stopped {
		d.mu.Unlock()
		return
	}
	d.pending = ns
	d.generation++
	capturedGen := d.generation
	if d.timer != nil {
		d.timer.Stop()
	}
	timer := time.AfterFunc(d.interval, func() {
		d.mu.Lock()
		defer d.mu.Unlock()
		if d.stopped || capturedGen != d.generation {
			return
		}
		captured := d.pending
		d.mu.Unlock()
		if d.activeFn() {
			d.fn(captured)
		}
		d.mu.Lock()
	})
	d.timer = timer
	d.mu.Unlock()
}

// Stop stops the debouncer, preventing any pending or future callback invocations.
func (d *Debouncer) Stop() {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.timer != nil {
		d.timer.Stop()
	}
	d.stopped = true
}
