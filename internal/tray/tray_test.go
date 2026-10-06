package tray

import (
	"sync"
	"testing"
	"time"
)

func TestDispatchCallsRightHandler(t *testing.T) {
	tests := []struct {
		name       string
		tag        int
		wantCalled string
	}{
		{
			name:       "ItemOpen dispatches to OnOpen",
			tag:        ItemOpen,
			wantCalled: "OnOpen",
		},
		{
			name:       "ItemSettings dispatches to OnSettings",
			tag:        ItemSettings,
			wantCalled: "OnSettings",
		},
		{
			name:       "ItemAbout dispatches to OnAbout",
			tag:        ItemAbout,
			wantCalled: "OnAbout",
		},
		{
			name:       "ItemQuit dispatches to OnQuit",
			tag:        ItemQuit,
			wantCalled: "OnQuit",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ch := make(chan string)
			h := Handlers{
				OnOpen: func() {
					ch <- "OnOpen"
				},
				OnSettings: func() {
					ch <- "OnSettings"
				},
				OnAbout: func() {
					ch <- "OnAbout"
				},
				OnQuit: func() {
					ch <- "OnQuit"
				},
			}

			mu.Lock()
			handlers = h
			mu.Unlock()

			dispatch(tt.tag)

			// Wait for goroutine to deliver result.
			select {
			case got := <-ch:
				if got != tt.wantCalled {
					t.Errorf("got handler %q, want %q", got, tt.wantCalled)
				}
			case <-time.After(1 * time.Second):
				t.Errorf("timeout waiting for %s handler", tt.wantCalled)
			}
		})
	}
}

func TestDispatchUnknownTagIgnored(t *testing.T) {
	h := Handlers{
		OnOpen: func() {
			t.Error("OnOpen should not be called")
		},
	}

	mu.Lock()
	handlers = h
	mu.Unlock()

	// Should not panic or call any handler.
	dispatch(9999)
	time.Sleep(100 * time.Millisecond) // Give any goroutine time to run.
}

func TestDispatchNilHandlerIgnored(t *testing.T) {
	h := Handlers{
		OnSettings: func() {
			t.Error("OnSettings should not be called")
		},
		OnAbout: nil, // Explicitly nil
	}

	mu.Lock()
	handlers = h
	mu.Unlock()

	// Should not panic.
	dispatch(ItemAbout)
	time.Sleep(100 * time.Millisecond)
}

func TestDispatchReturnsBeforeHandlerFinishes(t *testing.T) {
	// Test that dispatch is async: it should return immediately
	// even if the handler blocks.
	blocking := make(chan struct{})
	done := make(chan struct{})

	h := Handlers{
		OnOpen: func() {
			<-blocking
			close(done)
		},
	}

	mu.Lock()
	handlers = h
	mu.Unlock()

	start := time.Now()
	dispatch(ItemOpen)
	elapsed := time.Since(start)

	// dispatch should return nearly immediately (much less than 1 second).
	if elapsed > 100*time.Millisecond {
		t.Errorf("dispatch took too long: %v", elapsed)
	}

	// Now unblock and verify the handler completes.
	close(blocking)
	select {
	case <-done:
		// Handler ran successfully.
	case <-time.After(1 * time.Second):
		t.Error("handler did not complete")
	}
}

func TestSetHandlersReplacesPrevious(t *testing.T) {
	first := make(chan struct{}, 1)
	second := make(chan struct{}, 1)
	SetHandlers(Handlers{OnOpen: func() { first <- struct{}{} }})
	SetHandlers(Handlers{OnOpen: func() { second <- struct{}{} }})

	dispatch(ItemOpen)

	select {
	case <-second:
	case <-time.After(time.Second):
		t.Fatal("replacement handler not called")
	}
	select {
	case <-first:
		t.Fatal("stale handler was called")
	default:
	}
}

func TestDispatchIsConcurrentSafe(t *testing.T) {
	// Verify that concurrent calls to dispatch don't race.
	count := 0
	mu2 := sync.Mutex{}

	h := Handlers{
		OnOpen: func() {
			mu2.Lock()
			count++
			mu2.Unlock()
		},
		OnSettings: func() {
			mu2.Lock()
			count++
			mu2.Unlock()
		},
	}

	mu.Lock()
	handlers = h
	mu.Unlock()

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(tag int) {
			defer wg.Done()
			dispatch(tag)
		}((i % 2) + 1) // Alternate between ItemOpen and ItemSettings
	}

	wg.Wait()
	time.Sleep(200 * time.Millisecond) // Wait for all goroutines to complete.

	mu2.Lock()
	finalCount := count
	mu2.Unlock()

	if finalCount != 10 {
		t.Errorf("expected 10 handler calls, got %d", finalCount)
	}
}
