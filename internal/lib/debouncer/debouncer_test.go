package debouncer

import (
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestDebouncerSingleCallOnRapidTriggers(t *testing.T) {
	const interval = 50 * time.Millisecond
	var calls int32

	d := NewDebouncer(interval, func(_ string) {
		atomic.AddInt32(&calls, 1)
	}, func() bool { return true })

	for range 10 {
		d.Trigger("ns")
	}

	time.Sleep(2 * interval)

	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Errorf("expected 1 fn call after rapid triggers; got %d", got)
	}
}

func TestDebouncerCapturesLastNamespace(t *testing.T) {
	const interval = 50 * time.Millisecond
	var captured string
	var mu sync.Mutex
	done := make(chan struct{})

	d := NewDebouncer(interval, func(ns string) {
		mu.Lock()
		captured = ns
		mu.Unlock()
		close(done)
	}, func() bool { return true })

	d.Trigger("first")
	d.Trigger("second")
	d.Trigger("last")

	select {
	case <-done:
	case <-time.After(3 * interval):
		t.Fatal("fn was never called")
	}

	mu.Lock()
	got := captured
	mu.Unlock()

	if got != "last" {
		t.Errorf("captured namespace = %q; want %q", got, "last")
	}
}

func TestDebouncerTwoSequentialWindows(t *testing.T) {
	const interval = 50 * time.Millisecond
	var calls int32

	d := NewDebouncer(interval, func(_ string) {
		atomic.AddInt32(&calls, 1)
	}, func() bool { return true })

	d.Trigger("first-window")
	time.Sleep(2 * interval) // let first window fire

	d.Trigger("second-window")
	time.Sleep(2 * interval) // let second window fire

	if got := atomic.LoadInt32(&calls); got != 2 {
		t.Errorf("expected 2 fn calls for 2 windows; got %d", got)
	}
}

func TestDebouncerConcurrentTriggersSingleWindow(t *testing.T) {
	const interval = 50 * time.Millisecond
	var calls int32

	d := NewDebouncer(interval, func(_ string) {
		atomic.AddInt32(&calls, 1)
	}, func() bool { return true })

	var wg sync.WaitGroup
	for range 20 {
		wg.Go(func() { d.Trigger("ns") })
	}
	wg.Wait()

	time.Sleep(2 * interval)

	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Errorf("expected at most 1 fn call from concurrent triggers; got %d", got)
	}
}

func TestDebouncerActiveFnSuppressesCallback(t *testing.T) {
	const interval = 50 * time.Millisecond
	var calls int32
	var active int32 = 1

	d := NewDebouncer(interval, func(_ string) {
		atomic.AddInt32(&calls, 1)
	}, func() bool { return atomic.LoadInt32(&active) == 1 })

	d.Trigger("ns")
	atomic.StoreInt32(&active, 0) // simulate context switch before timer fires

	time.Sleep(2 * interval)

	if got := atomic.LoadInt32(&calls); got != 0 {
		t.Errorf("expected 0 fn calls when activeFn returns false; got %d", got)
	}
}

func TestDebouncerStopPreventsCallbackBeforeFire(t *testing.T) {
	const interval = 50 * time.Millisecond
	var calls int32

	d := NewDebouncer(interval, func(_ string) {
		atomic.AddInt32(&calls, 1)
	}, func() bool { return true })

	d.Trigger("ns")
	d.Stop()

	time.Sleep(2 * interval)

	if got := atomic.LoadInt32(&calls); got != 0 {
		t.Errorf("expected 0 fn calls after Stop(); got %d", got)
	}
}

func TestDebouncerStopPreventsNewTriggers(t *testing.T) {
	const interval = 50 * time.Millisecond
	var calls int32

	d := NewDebouncer(interval, func(_ string) {
		atomic.AddInt32(&calls, 1)
	}, func() bool { return true })

	d.Stop()
	d.Trigger("ns")

	time.Sleep(2 * interval)

	if got := atomic.LoadInt32(&calls); got != 0 {
		t.Errorf("expected 0 fn calls after Stop(); got %d", got)
	}
}

func TestDebouncerGenerationCounterFiltersStaleCallbacks(t *testing.T) {
	const interval = 50 * time.Millisecond
	var calls int32

	d := NewDebouncer(interval, func(_ string) {
		atomic.AddInt32(&calls, 1)
	}, func() bool { return true })

	// Trigger multiple times rapidly — only the last generation should fire
	d.Trigger("first")
	d.Trigger("second")
	d.Trigger("third")

	time.Sleep(2 * interval)

	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Errorf("expected 1 fn call from generation counter; got %d", got)
	}
}
