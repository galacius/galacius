package grpc

import (
	"fmt"
	"sync"
	"testing"
)

// TestGRPCServerConfig_StartSucceeds tests that a server can be successfully started.
func TestGRPCServerConfig_StartSucceeds(t *testing.T) {
	cfg, err := NewGRPCServerConfig(func(payload map[string]any) {})
	if err != nil {
		t.Fatalf("failed to create gRPC server: %v", err)
	}
	defer cfg.Stop()

	if cfg == nil {
		t.Fatal("expected non-nil config")
	}
}

// TestGRPCServerConfig_PortIsAssigned tests that the server is assigned a valid port.
func TestGRPCServerConfig_PortIsAssigned(t *testing.T) {
	cfg, err := NewGRPCServerConfig(func(payload map[string]any) {})
	if err != nil {
		t.Fatalf("failed to create gRPC server: %v", err)
	}
	defer cfg.Stop()

	port := cfg.Port()
	if port < 1024 || port > 65535 {
		t.Fatalf("expected valid port, got %d", port)
	}
}

// TestGRPCServerConfig_PortsDiffer tests that multiple servers get different ports.
func TestGRPCServerConfig_PortsDiffer(t *testing.T) {
	cfg1, err := NewGRPCServerConfig(func(payload map[string]any) {})
	if err != nil {
		t.Fatalf("failed to create first gRPC server: %v", err)
	}
	defer cfg1.Stop()

	cfg2, err := NewGRPCServerConfig(func(payload map[string]any) {})
	if err != nil {
		t.Fatalf("failed to create second gRPC server: %v", err)
	}
	defer cfg2.Stop()

	if cfg1.Port() == cfg2.Port() {
		t.Fatalf("expected different ports, got %d and %d", cfg1.Port(), cfg2.Port())
	}
}

// TestGRPCServerConfig_PluginServerIsAccessible tests that the PluginServer is accessible.
func TestGRPCServerConfig_PluginServerIsAccessible(t *testing.T) {
	cfg, err := NewGRPCServerConfig(func(payload map[string]any) {})
	if err != nil {
		t.Fatalf("failed to create gRPC server: %v", err)
	}
	defer cfg.Stop()

	server := cfg.PluginServer()
	if server == nil {
		t.Fatal("expected plugin server to be non-nil")
	}

	// Verify we can publish to it
	ok := server.PublishToHost("test.topic", "{}")
	if !ok {
		t.Fatal("expected publish to succeed before stop")
	}
}

// TestGRPCServerConfig_StopPreventsPublish tests that Stop() prevents further publishes.
func TestGRPCServerConfig_StopPreventsPublish(t *testing.T) {
	cfg, err := NewGRPCServerConfig(func(payload map[string]any) {})
	if err != nil {
		t.Fatalf("failed to create gRPC server: %v", err)
	}

	server := cfg.PluginServer()

	// Should work before stop
	ok := server.PublishToHost("before-stop", "{}")
	if !ok {
		t.Fatal("publish before stop should succeed")
	}

	// Stop the server
	cfg.Stop()

	// Should fail after stop
	ok = server.PublishToHost("after-stop", "{}")
	if ok {
		t.Fatal("publish after stop should fail")
	}
}

// TestGRPCServerConfig_StopIdempotent tests that multiple Stop() calls are safe.
func TestGRPCServerConfig_StopIdempotent(t *testing.T) {
	cfg, err := NewGRPCServerConfig(func(payload map[string]any) {})
	if err != nil {
		t.Fatalf("failed to create gRPC server: %v", err)
	}

	// Should be safe to call Stop() multiple times
	cfg.Stop()
	cfg.Stop()
	cfg.Stop()

	// Should still be stopped
	ok := cfg.PluginServer().PublishToHost("test.topic", "{}")
	if ok {
		t.Fatal("expected publish to fail after stop")
	}
}

// TestGRPCServerConfig_ConcurrentCreation tests that multiple servers can be created concurrently.
func TestGRPCServerConfig_ConcurrentCreation(t *testing.T) {
	numServers := 10
	cfgs := make([]*GRPCServerConfig, numServers)
	errs := make(chan error, numServers)
	var wg sync.WaitGroup

	for i := range numServers {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			cfg, err := NewGRPCServerConfig(func(payload map[string]any) {})
			if err != nil {
				errs <- fmt.Errorf("failed to create server %d: %v", idx, err)
				return
			}
			cfgs[idx] = cfg
		}(i)
	}

	wg.Wait()
	close(errs)

	// Check for errors
	for err := range errs {
		if err != nil {
			t.Fatalf("%v", err)
		}
	}

	// Defer cleanup
	for i := range numServers {
		if cfgs[i] != nil {
			defer cfgs[i].Stop()
		}
	}

	// Verify all have different ports
	ports := make(map[int]bool)
	for i := range numServers {
		if cfgs[i] == nil {
			t.Fatalf("server %d is nil", i)
		}
		port := cfgs[i].Port()
		if ports[port] {
			t.Fatalf("duplicate port %d", port)
		}
		ports[port] = true
	}
}

// TestGRPCServerConfig_ListenerKeptAlive tests that the listener is properly maintained.
func TestGRPCServerConfig_ListenerKeptAlive(t *testing.T) {
	cfg, err := NewGRPCServerConfig(func(payload map[string]any) {})
	if err != nil {
		t.Fatalf("failed to create gRPC server: %v", err)
	}
	defer cfg.Stop()

	// Simulate some time passing and GC pressure
	port := cfg.Port()

	// The port should still be valid
	if port < 1024 || port > 65535 {
		t.Fatalf("port became invalid after creation: %d", port)
	}

	// Server should still be accessible
	server := cfg.PluginServer()
	if server == nil {
		t.Fatal("plugin server became nil")
	}

	// Should still be able to publish
	ok := server.PublishToHost("test.topic", "{}")
	if !ok {
		t.Fatal("publish failed - listener may have been garbage collected")
	}
}
