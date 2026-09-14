// Package pluginsync holds the plugin subprocess's outbound gRPC client to the host
// app — dialing the host's gRPC server and subscribing to cluster context
// and active namespaces changes via pub/sub.
package async

import (
	"context"
	"fmt"
	"sync"

	grpclib "google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/galacius/galacius/packages/core/pb"
)

// GrpcClient wraps a connection to the host's gRPC server, offering pub/sub
// publish and subscribe on top of it. Safe for concurrent use — a single
// instance may be shared across event emission and multiple watch loops.
type GrpcClient struct {
	mu     sync.RWMutex
	conn   *grpclib.ClientConn
	client pb.PluginClient
}

// NewGrpcClient wraps an existing connection to the host's gRPC server.
func NewGrpcClient(conn *grpclib.ClientConn) *GrpcClient {
	return &GrpcClient{conn: conn, client: pb.NewPluginClient(conn)}
}

// Close closes the underlying connection.
func (c *GrpcClient) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn == nil {
		return nil
	}
	return c.conn.Close()
}

// Dial dials the host's gRPC server with authentication interceptors,
// populating the client's connection.
func (c *GrpcClient) Dial(addr, authToken string) error {
	unaryInterceptor, streamInterceptor := NewAuthInterceptors(authToken)

	conn, err := grpclib.NewClient(
		addr,
		grpclib.WithTransportCredentials(insecure.NewCredentials()),
		grpclib.WithUnaryInterceptor(unaryInterceptor),
		grpclib.WithStreamInterceptor(streamInterceptor),
	)
	if err != nil {
		return fmt.Errorf("dial host grpc server: %w", err)
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn != nil {
		c.conn.Close()
	}
	c.conn = conn
	c.client = pb.NewPluginClient(conn)
	return nil
}

// Subscribe opens a pub/sub stream for the given topic.
func (c *GrpcClient) Subscribe(topic string) (SubscribeStream, error) {
	c.mu.RLock()
	client := c.client
	c.mu.RUnlock()

	stream, err := client.Subscribe(context.Background(), &pb.SubscribeRequest{Topic: topic})
	if err != nil {
		return nil, fmt.Errorf("subscribe to topic %q: %w", topic, err)
	}
	return stream, nil
}

// Publish publishes a message to the given topic on the host's pub/sub broker.
func (c *GrpcClient) Publish(ctx context.Context, topic, payloadJSON string) error {
	c.mu.RLock()
	client := c.client
	c.mu.RUnlock()

	_, err := client.Publish(ctx, &pb.PublishRequest{Topic: topic, PayloadJson: payloadJSON})
	if err != nil {
		return fmt.Errorf("publish to topic %q: %w", topic, err)
	}
	return nil
}

// DialAndSubscribe dials the host's gRPC server and opens a pub/sub stream
// for the given topic with authentication.
func (c *GrpcClient) DialAndSubscribe(addr, topic, authToken string) (SubscribeStream, error) {
	if err := c.Dial(addr, authToken); err != nil {
		return nil, err
	}

	stream, err := c.Subscribe(topic)
	if err != nil {
		c.Close()
		return nil, err
	}

	return stream, nil
}
