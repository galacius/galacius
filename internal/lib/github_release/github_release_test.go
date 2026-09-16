package githubrelease

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestResolveLatestTag(t *testing.T) {
	ctx := context.Background()

	// Setup a mock HTTP server that serves a redirect from /releases/latest to /releases/tag/v1.2.3
	// We need to declare server first so the handler can reference it
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/releases/latest" {
			// Send a redirect (this is how GitHub's public releases/latest endpoint works)
			http.Redirect(w, r, server.URL+"/releases/tag/v1.2.3", http.StatusMovedPermanently)
			return
		}
		if r.URL.Path == "/releases/tag/v1.2.3" {
			// The redirect target doesn't need to serve anything; we just extract the tag from the URL
			w.WriteHeader(http.StatusOK)
			return
		}
		http.NotFound(w, r)
	}))
	defer server.Close()

	tag, err := ResolveLatestTag(ctx, server.URL)
	if err != nil {
		t.Fatalf("ResolveLatestTag() error = %v", err)
	}
	if tag != "v1.2.3" {
		t.Errorf("tag = %q; want %q", tag, "v1.2.3")
	}
}

func TestResolveLatestTag_MissingTag(t *testing.T) {
	ctx := context.Background()

	// Server that doesn't redirect properly
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Return OK but at the wrong URL (no /releases/tag/ in path)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	_, err := ResolveLatestTag(ctx, server.URL)
	if err == nil {
		t.Fatal("ResolveLatestTag() error = nil; want error")
	}
	if !strings.Contains(err.Error(), "could not find tag") {
		t.Errorf("error = %q; want to mention tag not found", err.Error())
	}
}

func TestCheckAPIResponse_OK(t *testing.T) {
	resp := &http.Response{StatusCode: http.StatusOK, Header: http.Header{}}
	if err := CheckAPIResponse(resp); err != nil {
		t.Errorf("CheckAPIResponse() error = %v; want nil", err)
	}
}

func TestCheckAPIResponse_RateLimited(t *testing.T) {
	resp := &http.Response{StatusCode: http.StatusForbidden, Header: http.Header{}}
	resp.Header.Set("X-RateLimit-Remaining", "0")
	resp.Header.Set("X-RateLimit-Reset", "1700000000")

	err := CheckAPIResponse(resp)
	if err == nil {
		t.Fatal("CheckAPIResponse() error = nil; want rate limit error")
	}
	if !strings.Contains(err.Error(), "rate limit exceeded") {
		t.Errorf("error = %q; want it to mention rate limit exceeded", err.Error())
	}
}

func TestCheckAPIResponse_GenericError(t *testing.T) {
	resp := &http.Response{StatusCode: http.StatusInternalServerError, Header: http.Header{}}

	err := CheckAPIResponse(resp)
	if err == nil {
		t.Fatal("CheckAPIResponse() error = nil; want error")
	}
	if !strings.Contains(err.Error(), "HTTP 500") {
		t.Errorf("error = %q; want it to mention HTTP 500", err.Error())
	}
}

func TestCheckAPIResponse_ForbiddenWithoutRateLimitRemainingIsGenericError(t *testing.T) {
	resp := &http.Response{StatusCode: http.StatusForbidden, Header: http.Header{}}

	err := CheckAPIResponse(resp)
	if err == nil {
		t.Fatal("CheckAPIResponse() error = nil; want error")
	}
	if !strings.Contains(err.Error(), "HTTP 403") {
		t.Errorf("error = %q; want generic status-code error when not rate-limited", err.Error())
	}
}

func TestCheckAPIResponse_TooManyRequestsIsAlwaysRateLimited(t *testing.T) {
	resp := &http.Response{StatusCode: http.StatusTooManyRequests, Header: http.Header{}}

	err := CheckAPIResponse(resp)
	if !strings.Contains(err.Error(), "rate limit exceeded") {
		t.Errorf("error = %q; want it to mention rate limit exceeded", err.Error())
	}
}
