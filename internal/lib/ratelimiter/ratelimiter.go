// Package ratelimiter provides a typed error for GitHub API rate-limit
// (HTTP 403) responses, shared by any package that talks to the GitHub API.
package ratelimiter

import (
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// RateLimitError represents a GitHub API rate-limit error (HTTP 403).
// It implements the error interface and includes optional reset time information.
type RateLimitError struct {
	Message   string
	ResetTime *time.Time
}

func (e *RateLimitError) Error() string {
	return e.Message
}

// BuildError constructs a RateLimitError from an HTTP response.
// If the X-RateLimit-Reset header is present and valid, it parses the Unix
// timestamp and includes it in the error message. Otherwise, it returns a
// generic rate-limit message.
func BuildError(resp *http.Response) *RateLimitError {
	resetStr := resp.Header.Get("X-RateLimit-Reset")
	if resetStr == "" {
		return &RateLimitError{
			Message:   "GitHub API rate limit exceeded, please try again later",
			ResetTime: nil,
		}
	}

	resetUnix, err := strconv.ParseInt(resetStr, 10, 64)
	if err != nil {
		// Header present but unparseable; fall back to generic message
		return &RateLimitError{
			Message:   "GitHub API rate limit exceeded, please try again later",
			ResetTime: nil,
		}
	}

	resetTime := time.Unix(resetUnix, 0)
	msg := fmt.Sprintf("GitHub API rate limit exceeded, resets at %s",
		resetTime.Format(time.RFC3339))
	return &RateLimitError{
		Message:   msg,
		ResetTime: &resetTime,
	}
}
