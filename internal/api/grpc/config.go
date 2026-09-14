package grpc

import (
	"fmt"
	"net"

	"github.com/galacius/galacius/packages/core/pb"
	"google.golang.org/grpc"
)

// GRPCServerConfig manages the host's gRPC server for plugin cluster context streaming.
type GRPCServerConfig struct {
	server       *grpc.Server
	port         int
	pluginServer *HostPluginServer
	authManager  *AuthTokenManager
	ln           net.Listener // Keep listener alive for the lifetime of the server
}

// NewGRPCServerConfig starts a new gRPC server on 127.0.0.1:0 (auto-assigned port).
// The server is configured with authentication interceptors and no reflection
// (schema is deliberately not exposed to prevent information disclosure).
func NewGRPCServerConfig(eventEmitFn func(payload map[string]any)) (*GRPCServerConfig, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("listen for gRPC: %w", err)
	}

	// Create the authentication token manager.
	authManager := NewAuthTokenManager()

	// Create the gRPC server with interceptors.
	// Reflection is deliberately not registered (security: do not expose schema to arbitrary same-host callers).
	server := grpc.NewServer(
		grpc.UnaryInterceptor(UnaryServerInterceptor(authManager)),
		grpc.StreamInterceptor(StreamServerInterceptor(authManager)),
	)
	pluginServer := NewHostPluginServer(eventEmitFn, authManager)
	pb.RegisterPluginServer(server, pluginServer)

	cfg := &GRPCServerConfig{
		server:       server,
		pluginServer: pluginServer,
		authManager:  authManager,
		ln:           ln,
	}

	// Extract port from listener
	addr := ln.Addr().String()
	_, portStr, err := net.SplitHostPort(addr)
	if err != nil {
		server.Stop()
		return nil, fmt.Errorf("parse listener address: %w", err)
	}
	_, err = fmt.Sscanf(portStr, "%d", &cfg.port)
	if err != nil {
		server.Stop()
		return nil, fmt.Errorf("parse port: %w", err)
	}

	// Start serving in background
	go func() {
		if err := server.Serve(ln); err != nil && err != net.ErrClosed {
			fmt.Printf("grpc server error: %v\n", err)
		}
	}()

	return cfg, nil
}

// Port returns the assigned gRPC port.
func (c *GRPCServerConfig) Port() int {
	return c.port
}

// PluginServer returns the underlying HostPluginServer for publishing context changes.
func (c *GRPCServerConfig) PluginServer() *HostPluginServer {
	return c.pluginServer
}

// RegisterToken registers a token for a plugin and makes it available for authentication.
func (c *GRPCServerConfig) RegisterToken(token, pluginID string) {
	if c.authManager != nil {
		c.authManager.RegisterToken(token, pluginID)
	}
}

// RemoveToken removes a token from the authentication map.
func (c *GRPCServerConfig) RemoveToken(token string) {
	if c.authManager != nil {
		c.authManager.RemoveToken(token)
	}
}

// Stop gracefully stops the server. It marks the server as stopped first to prevent
// new publishes during shutdown, then waits for active streams to close.
func (c *GRPCServerConfig) Stop() {
	if c.pluginServer != nil {
		c.pluginServer.MarkStopped()
	}
	if c.server != nil {
		c.server.GracefulStop()
	}
}
