package emitpump

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestEnqueueAndEmit(t *testing.T) {
	// Test that enqueued events eventually get emitted with correct payload.
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	emitted := make(map[string]any)
	var mu sync.Mutex
	emit := func(eventName string, payload any) {
		mu.Lock()
		emitted[eventName] = payload
		mu.Unlock()
	}

	p := New(ctx, emit)
	defer p.Drain()

	p.Enqueue("test:event", func() any { return "hello" })

	// Wait for emission
	for {
		mu.Lock()
		if len(emitted) > 0 {
			mu.Unlock()
			break
		}
		mu.Unlock()
		if ctx.Err() != nil {
			t.Fatal("timeout waiting for emit")
		}
		time.Sleep(1 * time.Millisecond)
	}

	mu.Lock()
	defer mu.Unlock()

	if val, ok := emitted["test:event"]; !ok || val != "hello" {
		t.Errorf("expected emitted[test:event]='hello', got %v", emitted["test:event"])
	}
}

func TestCoalescing(t *testing.T) {
	// Test that two rapid Enqueue calls for the same eventName result in
	// exactly one emit with the LATEST payload.
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	var emitCount int32
	var lastPayload string
	var mu sync.Mutex

	emit := func(eventName string, payload any) {
		mu.Lock()
		atomic.AddInt32(&emitCount, 1)
		lastPayload = payload.(string)
		mu.Unlock()
	}

	p := New(ctx, emit)
	defer p.Drain()

	p.Enqueue("coalesce:test", func() any { return "first" })
	p.Enqueue("coalesce:test", func() any { return "second" })

	// Wait for emission to settle
	time.Sleep(50 * time.Millisecond)

	count := atomic.LoadInt32(&emitCount)
	mu.Lock()
	payload := lastPayload
	mu.Unlock()

	if count != 1 {
		t.Errorf("expected exactly 1 emit, got %d", count)
	}
	if payload != "second" {
		t.Errorf("expected payload 'second', got '%s'", payload)
	}
}

func TestConcurrentEnqueue(t *testing.T) {
	// Test that concurrent Enqueue calls from multiple goroutines don't race.
	// This test should be run with -race to catch data races.
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	var emitCount int32
	emit := func(eventName string, payload any) {
		atomic.AddInt32(&emitCount, 1)
	}

	p := New(ctx, emit)
	defer p.Drain()

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				p.Enqueue("concurrent", func() any { return idx*10 + j })
			}
		}(i)
	}

	wg.Wait()

	// Give pump time to drain
	time.Sleep(100 * time.Millisecond)

	// Just verify it didn't panic or deadlock; exact count is hard to predict
	// due to coalescing.
	if atomic.LoadInt32(&emitCount) == 0 {
		t.Error("expected at least some emissions")
	}
}

func TestShutdown(t *testing.T) {
	// Test that the pump stops cleanly when ctx is cancelled
	// and doesn't leak goroutines.
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)

	emit := func(eventName string, payload any) {}

	p := New(ctx, emit)

	// Cancel context to trigger shutdown
	cancel()

	// Wait for pump to exit (with a safety timeout)
	select {
	case <-p.done:
		// Successfully stopped
	case <-time.After(500 * time.Millisecond):
		t.Fatal("pump did not stop within timeout after ctx cancellation")
	}
}

func TestMultipleEvents(t *testing.T) {
	// Test that different eventNames can be queued and emitted in order.
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	var emitted []string
	var mu sync.Mutex
	emit := func(eventName string, payload any) {
		mu.Lock()
		emitted = append(emitted, eventName)
		mu.Unlock()
	}

	p := New(ctx, emit)
	defer p.Drain()

	p.Enqueue("event1", func() any { return 1 })
	p.Enqueue("event2", func() any { return 2 })
	p.Enqueue("event3", func() any { return 3 })

	// Wait for emissions to settle
	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	if len(emitted) < 3 {
		t.Errorf("expected at least 3 emissions, got %d: %v", len(emitted), emitted)
	}

	// Check that all events were emitted (order doesn't matter due to map iteration)
	eventSet := make(map[string]bool)
	for _, name := range emitted {
		eventSet[name] = true
	}

	for _, expected := range []string{"event1", "event2", "event3"} {
		if !eventSet[expected] {
			t.Errorf("expected event %s to be emitted, but it wasn't", expected)
		}
	}
}
