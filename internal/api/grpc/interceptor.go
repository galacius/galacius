package grpc

import (
	"context"
	"strings"
	"sync"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// contextKeyPluginID is an unexported context key type used to store the plugin ID
// in the gRPC request context after authentication.
type contextKeyPluginID struct{}

// AuthTokenManager manages the mapping of authentication tokens to plugin IDs.
// It is protected by a mutex to ensure thread-safe access.
type AuthTokenManager struct {
	mu        sync.RWMutex
	tokenToID map[string]string // token -> pluginID
}

// NewAuthTokenManager creates a new token manager.
func NewAuthTokenManager() *AuthTokenManager {
	return &AuthTokenManager{
		tokenToID: make(map[string]string),
	}
}

// RegisterToken registers a token and associates it with a plugin ID.
// This must be called before the plugin attempts to authenticate.
func (m *AuthTokenManager) RegisterToken(token, pluginID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.tokenToID[token] = pluginID
}

// RemoveToken removes a token from the mapping.
// This should be called when the plugin is shut down or when the token expires.
func (m *AuthTokenManager) RemoveToken(token string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.tokenToID, token)
}

// ResolveToken looks up a token and returns the associated plugin ID.
// Returns empty string if the token is not found.
func (m *AuthTokenManager) ResolveToken(token string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.tokenToID[token]
}

// extractAuthorizationToken extracts the bearer token from gRPC metadata.
// Returns empty string if the authorization header is missing or malformed.
func extractAuthorizationToken(md metadata.MD) string {
	authHeaders := md.Get("authorization")
	if len(authHeaders) == 0 {
		return ""
	}

	// Extract bearer token from "authorization: bearer <token>" header. The
	// scheme ("bearer") is matched case-insensitively per RFC 6750, but the
	// token itself is left as-is — it must not be case-folded.
	authHeader := authHeaders[0]
	const scheme = "bearer "
	if len(authHeader) < len(scheme) || !strings.EqualFold(authHeader[:len(scheme)], scheme) {
		return ""
	}

	return strings.TrimSpace(authHeader[len(scheme):])
}

// UnaryServerInterceptor returns a gRPC unary server interceptor that extracts
// the authorization token from metadata, validates it, and injects the plugin ID
// into the request context. Missing or invalid tokens return the same generic
// unauthenticated error (to avoid fingerprinting attacks).
func UnaryServerInterceptor(manager *AuthTokenManager) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		// Extract metadata from context.
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			md = metadata.New(nil)
		}

		// Extract the authorization token.
		token := extractAuthorizationToken(md)
		if token == "" {
			return nil, status.Error(codes.Unauthenticated, "invalid or missing authentication")
		}

		// Resolve token to plugin ID.
		pluginID := manager.ResolveToken(token)
		if pluginID == "" {
			// Same error as missing token (avoid fingerprinting).
			return nil, status.Error(codes.Unauthenticated, "invalid or missing authentication")
		}

		// Inject plugin ID into context.
		ctx = context.WithValue(ctx, contextKeyPluginID{}, pluginID)

		// Call the handler with the enriched context.
		return handler(ctx, req)
	}
}

// StreamServerInterceptor returns a gRPC stream server interceptor that extracts
// the authorization token from metadata, validates it, and injects the plugin ID
// into the request context. Missing or invalid tokens return the same generic
// unauthenticated error (to avoid fingerprinting attacks).
func StreamServerInterceptor(manager *AuthTokenManager) grpc.StreamServerInterceptor {
	return func(srv any, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		// Extract metadata from context.
		md, ok := metadata.FromIncomingContext(ss.Context())
		if !ok {
			md = metadata.New(nil)
		}

		// Extract the authorization token.
		token := extractAuthorizationToken(md)
		if token == "" {
			return status.Error(codes.Unauthenticated, "invalid or missing authentication")
		}

		// Resolve token to plugin ID.
		pluginID := manager.ResolveToken(token)
		if pluginID == "" {
			// Same error as missing token (avoid fingerprinting).
			return status.Error(codes.Unauthenticated, "invalid or missing authentication")
		}

		// Create a wrapper stream that injects the plugin ID into the context.
		wrappedStream := &serverStreamWrapper{
			ServerStream: ss,
			ctx:          context.WithValue(ss.Context(), contextKeyPluginID{}, pluginID),
		}

		// Call the handler with the wrapped stream.
		return handler(srv, wrappedStream)
	}
}

// serverStreamWrapper wraps a gRPC ServerStream and overrides the Context method
// to return a context with the plugin ID injected.
type serverStreamWrapper struct {
	grpc.ServerStream
	ctx context.Context
}

// Context returns the context with the plugin ID injected.
func (w *serverStreamWrapper) Context() context.Context {
	return w.ctx
}

// PluginIDFromContext extracts the plugin ID from the gRPC request context.
// Returns empty string if the plugin ID is not present (which should only happen
// if the interceptor is not properly configured).
func PluginIDFromContext(ctx context.Context) string {
	pluginID, ok := ctx.Value(contextKeyPluginID{}).(string)
	if !ok {
		return ""
	}
	return pluginID
}

// MustPluginIDFromContext extracts the plugin ID from the gRPC request context,
// panicking if it is not present. This is useful for handler implementations
// that know the interceptor is configured and require authentication.
func MustPluginIDFromContext(ctx context.Context) string {
	pluginID := PluginIDFromContext(ctx)
	if pluginID == "" {
		panic("plugin ID not found in context (interceptor not configured)")
	}
	return pluginID
}
