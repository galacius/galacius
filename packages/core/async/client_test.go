package async

import (
	"net"
	"sync/atomic"
	"testing"
	"time"

	grpclib "google.golang.org/grpc"

	"github.com/galacius/galacius/packages/core/pb"
)

// MockPluginServer implements a minimal mock for testing.
type MockPluginServer struct {
	pb.UnimplementedPluginServer
	watchCallCount int32
}

func (m *MockPluginServer) Subscribe(req *pb.SubscribeRequest, stream pb.Plugin_SubscribeServer) error {
	atomic.AddInt32(&m.watchCallCount, 1)
	// Just wait for context to be cancelled
	<-stream.Context().Done()
	return stream.Context().Err()
}

// TestDialAndSubscribe_RetriesUntilHostListening verifies that WatchClusterContext's
// dial step, run in a loop as WatchClusterContext itself does, keeps failing with a
// connection error while nothing is listening, then succeeds once a real gRPC server
// implementing Subscribe starts on that address.
func TestDialAndSubscribe_RetriesUntilHostListening(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("reserve address: %v", err)
	}
	addr := ln.Addr().String()
	ln.Close() // release the port; nothing is listening on it yet

	authToken := "test-token-64chars-" + "x" // Use a test token
	failClient := &GrpcClient{}
	if _, err := failClient.DialAndSubscribe(addr, string(EventTopicClusterContext), authToken); err == nil {
		t.Fatalf("expected DialAndSubscribe to fail while nothing is listening")
	}

	ln2, err := net.Listen("tcp", addr)
	if err != nil {
		t.Fatalf("re-listen on %s: %v", addr, err)
	}
	mock := &MockPluginServer{}
	srv := grpclib.NewServer()
	pb.RegisterPluginServer(srv, mock)
	go srv.Serve(ln2)
	defer srv.Stop()

	client := &GrpcClient{}
	stream, err := client.DialAndSubscribe(addr, string(EventTopicClusterContext), authToken)
	if err != nil {
		t.Fatalf("expected DialAndSubscribe to succeed once host is listening, got %v", err)
	}
	defer client.Close()
	if stream == nil {
		t.Fatal("expected non-nil stream on success")
	}

	// grpc.NewClient connects lazily, so the server only observes the call once the
	// stream is actually used on the wire; poll rather than asserting synchronously.
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if atomic.LoadInt32(&mock.watchCallCount) == 1 {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("expected host to observe exactly 1 Subscribe call, got %d", mock.watchCallCount)
}
