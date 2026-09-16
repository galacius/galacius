package ratelimiter

import (
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestBuildErrorWithValidResetHeader(t *testing.T) {
	resetUnix := int64(1691000000)

	resp := &http.Response{Header: http.Header{}}
	resp.Header.Set("X-RateLimit-Reset", "1691000000")

	err := BuildError(resp)

	if err == nil {
		t.Fatal("expected RateLimitError; got nil")
	}

	if err.ResetTime == nil {
		t.Error("expected ResetTime to be non-nil")
	} else {
		expected := time.Unix(resetUnix, 0)
		if !err.ResetTime.Equal(expected) {
			t.Errorf("ResetTime = %v; want %v", *err.ResetTime, expected)
		}
	}

	expectedMsg := time.Unix(resetUnix, 0).Format(time.RFC3339)
	if !strings.Contains(err.Message, "rate limit") || !strings.Contains(err.Message, expectedMsg) {
		t.Errorf("Message = %q; want to contain 'rate limit' and RFC3339 time %q", err.Message, expectedMsg)
	}
}

func TestBuildErrorWithNoResetHeader(t *testing.T) {
	resp := &http.Response{
		Header: http.Header{},
	}

	err := BuildError(resp)

	if err == nil {
		t.Fatal("expected RateLimitError; got nil")
	}

	if err.ResetTime != nil {
		t.Errorf("expected ResetTime to be nil; got %v", *err.ResetTime)
	}

	if err.Message != "GitHub API rate limit exceeded, please try again later" {
		t.Errorf("Message = %q; want generic message", err.Message)
	}
}

func TestBuildErrorWithUnparseableResetHeader(t *testing.T) {
	resp := &http.Response{Header: http.Header{}}
	resp.Header.Set("X-RateLimit-Reset", "not-a-number")

	err := BuildError(resp)

	if err == nil {
		t.Fatal("expected RateLimitError; got nil")
	}

	if err.ResetTime != nil {
		t.Errorf("expected ResetTime to be nil; got %v", *err.ResetTime)
	}

	if err.Message != "GitHub API rate limit exceeded, please try again later" {
		t.Errorf("Message = %q; want generic message", err.Message)
	}
}

func TestRateLimitErrorMethod(t *testing.T) {
	msg := "test error message"
	err := &RateLimitError{
		Message:   msg,
		ResetTime: nil,
	}

	if err.Error() != msg {
		t.Errorf("Error() = %q; want %q", err.Error(), msg)
	}
}

func TestRateLimitErrorMethodWithResetTime(t *testing.T) {
	msg := "rate limit with reset time"
	resetTime := time.Now()
	err := &RateLimitError{
		Message:   msg,
		ResetTime: &resetTime,
	}

	if err.Error() != msg {
		t.Errorf("Error() = %q; want %q", err.Error(), msg)
	}
}
