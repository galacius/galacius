package emitpump

import (
	"context"
	"sync"
	"time"
)

// EmitPump serializes and coalesces rapid Wails event emissions to prevent AppKit
// main-queue saturation when connecting to a cluster (~40-80 simultaneous EventsEmit
// calls would freeze the entire desktop UI). The pump drains one pending event at a
// time with a fixed 5ms inter-emit delay, and coalesces multiple Enqueue calls for
// the same eventName by replacing pending entries rather than queueing duplicates.
type EmitPump struct {
	ctx            context.Context
	emit           func(eventName string, payload any)
	pending        map[string]func() any // eventName -> payloadBuilder, protected by mu
	mu             sync.Mutex
	done           chan struct{}
	interEmitDelay time.Duration
}

// New creates a new EmitPump. The emit function is called serialized, one event at a time,
// at most once per interEmitDelay. The pump starts its own goroutine and stops when ctx is
// cancelled. interEmitDelay is calibrated for the connect-time burst (tens of distinct event
// names at once), not sustained high-frequency streaming — see pumpLoop.
func New(ctx context.Context, emit func(eventName string, payload any)) *EmitPump {
	p := &EmitPump{
		ctx:            ctx,
		emit:           emit,
		pending:        make(map[string]func() any),
		interEmitDelay: 5 * time.Millisecond,
		done:           make(chan struct{}),
	}

	go p.pumpLoop()
	return p
}

// Enqueue enqueues a pending event emission. If an entry for eventName already exists,
// it is replaced (coalesced) rather than queued. Safe to call concurrently.
func (p *EmitPump) Enqueue(eventName string, payloadBuilder func() any) {
	p.mu.Lock()
	p.pending[eventName] = payloadBuilder
	p.mu.Unlock()
}

// pumpLoop drains pending entries one at a time, with interEmitDelay between each,
// until ctx is cancelled. On shutdown, un-drained entries are discarded.
func (p *EmitPump) pumpLoop() {
	defer close(p.done)

	ticker := time.NewTicker(p.interEmitDelay)
	defer ticker.Stop()

	for {
		select {
		case <-p.ctx.Done():
			return
		case <-ticker.C:
			p.mu.Lock()
			if len(p.pending) == 0 {
				// No pending entries; wait for signal or cancellation
				p.mu.Unlock()
				continue
			}

			// Drain exactly one pending entry (FIFO isn't necessary for UI state broadcasts)
			var eventName string
			var payloadBuilder func() any
			for en, pb := range p.pending {
				eventName = en
				payloadBuilder = pb
				delete(p.pending, en)
				break
			}
			p.mu.Unlock()

			// Call payloadBuilder and emit outside the lock
			payload := payloadBuilder()
			p.emit(eventName, payload)
		}
	}
}

// Drain synchronously drains all pending events. Used for testing only;
// blocks until all pending entries have been emitted.
func (p *EmitPump) Drain() {
	for {
		p.mu.Lock()
		if len(p.pending) == 0 {
			p.mu.Unlock()
			return
		}
		p.mu.Unlock()
		time.Sleep(1 * time.Millisecond)
	}
}
