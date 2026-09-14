package async

import "testing"

// TestBackoffReconnector_ExponentialBackoff tests the backoff progression.
func TestBackoffReconnector_ExponentialBackoff(t *testing.T) {
	br := NewBackoffReconnector()

	expected := []int{1000, 2000, 4000, 8000, 16000, 30000, 30000}
	for i, exp := range expected {
		if br.backoffMS != exp {
			t.Fatalf("backoff[%d]: expected %dms, got %dms", i, exp, br.backoffMS)
		}
		br.OnDialError()
	}
}

// TestBackoffReconnector_ResetOnConnected tests that backoff resets after successful connection.
func TestBackoffReconnector_ResetOnConnected(t *testing.T) {
	br := NewBackoffReconnector()

	// Advance backoff
	br.OnDialError()
	br.OnDialError()
	br.OnDialError()

	if br.backoffMS != 8000 {
		t.Fatalf("expected backoff to be 8000 after 3 errors, got %d", br.backoffMS)
	}

	// Reset on connection
	br.OnConnected()

	if br.backoffMS != 1000 {
		t.Fatalf("expected backoff to reset to 1000, got %d", br.backoffMS)
	}
}

// TestBackoffReconnector_DialAndSubscribeErrors tests interleaved dial and subscribe errors.
func TestBackoffReconnector_DialAndSubscribeErrors(t *testing.T) {
	br := NewBackoffReconnector()

	// Dial error
	br.OnDialError()
	if br.backoffMS != 2000 {
		t.Fatalf("after 1 dial error: expected 2000ms, got %d", br.backoffMS)
	}

	// Subscribe error
	br.OnSubscribeError()
	if br.backoffMS != 4000 {
		t.Fatalf("after 1 subscribe error: expected 4000ms, got %d", br.backoffMS)
	}

	// Another dial error
	br.OnDialError()
	if br.backoffMS != 8000 {
		t.Fatalf("after another dial error: expected 8000ms, got %d", br.backoffMS)
	}
}
