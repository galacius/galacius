package ratelimiter

import (
	"net/http"
	"strings"
	"testing"
	"time"
)

// TestBuildErrorWithResetHeaderZero tests the edge case where the
// X-RateLimit-Reset header is "0" (parses successfully but represents Unix epoch).
// Should produce a valid ResetTime of time.Unix(0, 0).
func TestBuildErrorWithResetHeaderZero(t *testing.T) {
	resp := &http.Response{Header: http.Header{}}
	resp.Header.Set("X-RateLimit-Reset", "0")

	err := BuildError(resp)

	if err == nil {
		t.Fatal("expected RateLimitError; got nil")
	}

	if err.ResetTime == nil {
		t.Error("expected ResetTime to be non-nil for valid header value 0")
	} else {
		expected := time.Unix(0, 0)
		if !err.ResetTime.Equal(expected) {
			t.Errorf("ResetTime = %v; want %v", *err.ResetTime, expected)
		}
	}

	expected := time.Unix(0, 0).Format(time.RFC3339)
	if !strings.Contains(err.Message, "rate limit") || !strings.Contains(err.Message, expected) {
		t.Errorf("Message = %q; want to contain 'rate limit' and RFC3339 time %q", err.Message, expected)
	}
}

// TestBuildErrorWithNegativeResetHeader tests the edge case where the
// X-RateLimit-Reset header contains a negative number (parses fine per ParseInt).
// Should produce a valid ResetTime (before Unix epoch, which is valid in Go).
func TestBuildErrorWithNegativeResetHeader(t *testing.T) {
	negativeUnix := int64(-3600)
	resp := &http.Response{Header: http.Header{}}
	resp.Header.Set("X-RateLimit-Reset", "-3600")

	err := BuildError(resp)

	if err == nil {
		t.Fatal("expected RateLimitError; got nil")
	}

	if err.ResetTime == nil {
		t.Error("expected ResetTime to be non-nil for negative numeric value")
	} else {
		expected := time.Unix(negativeUnix, 0)
		if !err.ResetTime.Equal(expected) {
			t.Errorf("ResetTime = %v; want %v", *err.ResetTime, expected)
		}
	}

	if !strings.Contains(err.Message, "rate limit") {
		t.Errorf("Message = %q; want to contain 'rate limit'", err.Message)
	}
}

// TestBuildErrorWithEmptyResetHeader tests that an empty string header value
// is functionally identical to a missing header (Go's http.Header.Get returns
// "" for both cases). This confirms both paths converge to the generic message.
func TestBuildErrorWithEmptyResetHeader(t *testing.T) {
	// Empty header (set to empty string)
	resp := &http.Response{Header: http.Header{}}
	resp.Header.Set("X-RateLimit-Reset", "")

	err := BuildError(resp)

	if err == nil {
		t.Fatal("expected RateLimitError; got nil")
	}

	if err.ResetTime != nil {
		t.Errorf("expected ResetTime to be nil for empty header; got %v", *err.ResetTime)
	}

	if err.Message != "GitHub API rate limit exceeded, please try again later" {
		t.Errorf("Message = %q; want generic message", err.Message)
	}
}
