package grpc

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/galacius/galacius/packages/core/pb"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// HostPluginServer implements the gRPC Plugin service with native pub/sub support
// via Subscribe/Publish.
type HostPluginServer struct {
	pb.UnimplementedPluginServer
	mu sync.RWMutex

	// Native pub/sub broker
	broker *PubSubBroker

	// ackWaiters tracks in-flight PublishAndAwaitAck calls: requestID -> a channel
	// that each matching "plugins.<id>.ack" publish sends one value into. Guarded
	// by mu (the same lock stopped/eventEmitFn already use), not a separate lock,
	// since ack bookkeeping is a tiny, infrequent addition to the same struct.
	ackWaiters map[string]chan struct{}

	stopped     bool // flag to prevent publishing during shutdown
	eventEmitFn func(payload map[string]any)
	authManager *AuthTokenManager
}

// PubSubBroker manages topics and subscriber channels for pub/sub messaging.
// It maintains a lastMessage cache for host-owned topics (cluster.*, namespaces.*).
type PubSubBroker struct {
	mu          sync.RWMutex
	topics      map[string]map[int]chan *pb.PubSubMessage // topic -> subscriberID -> channel
	nextID      map[string]int                            // topic -> next subscriber ID
	lastMessage map[string]*pb.PubSubMessage              // topic -> last message (host topics only)
}

// NewPubSubBroker creates a new pub/sub broker.
func NewPubSubBroker() *PubSubBroker {
	return &PubSubBroker{
		topics:      make(map[string]map[int]chan *pb.PubSubMessage),
		nextID:      make(map[string]int),
		lastMessage: make(map[string]*pb.PubSubMessage),
	}
}

// NewHostPluginServer creates a new HostPluginServer.
func NewHostPluginServer(eventEmitFn func(payload map[string]any), authManager *AuthTokenManager) *HostPluginServer {
	return &HostPluginServer{
		broker:      NewPubSubBroker(),
		ackWaiters:  make(map[string]chan struct{}),
		eventEmitFn: eventEmitFn,
		authManager: authManager,
	}
}

// isAckTopic reports whether topic is a plugin's ack sink (plugins.<id>.ack), the
// convention PublishAndAwaitAck's callers use to learn a plugin applied a pushed
// value — see PublishAndAwaitAck.
func isAckTopic(topic string) bool {
	return strings.HasSuffix(topic, ".ack")
}

// topicRegex validates topic names: alphanumeric, dots, underscores, hyphens,
// and colons (colons separate segments within a plugin's own event name, e.g.
// "plugins.helm.helm:cleanup:complete").
var topicRegex = regexp.MustCompile(`^[a-zA-Z0-9._:-]+$`)

// isValidTopic checks if a topic name is valid.
func isValidTopic(topic string) bool {
	return topic != "" && topicRegex.MatchString(topic)
}

// isHostOwnedTopic checks if a topic is host-owned (e.g., cluster.*, namespaces.*).
func isHostOwnedTopic(topic string) bool {
	return len(topic) > 0 && (topic[0:min(8, len(topic))] == "cluster." || topic[0:min(11, len(topic))] == "namespaces.")
}

// Subscribe handles native pub/sub subscriptions for a given topic.
func (s *HostPluginServer) Subscribe(req *pb.SubscribeRequest, stream pb.Plugin_SubscribeServer) error {
	topic := req.Topic
	ctx := stream.Context()

	// Validate topic
	if !isValidTopic(topic) {
		return status.Error(codes.InvalidArgument, "invalid topic format")
	}

	// Register subscriber
	subscriberID, ch := s.broker.registerSubscriber(topic)

	// Send last message immediately if it exists (host-owned topics only)
	lastMsg := s.broker.getLastMessage(topic)
	if lastMsg != nil {
		if err := stream.Send(lastMsg); err != nil {
			s.broker.unregisterSubscriber(topic, subscriberID)
			return err
		}
	}

	// Stream loop
	for {
		select {
		case <-ctx.Done():
			s.broker.unregisterSubscriber(topic, subscriberID)
			return ctx.Err()
		case msg := <-ch:
			if err := stream.Send(msg); err != nil {
				s.broker.unregisterSubscriber(topic, subscriberID)
				return err
			}
		}
	}
}

// Publish publishes a message to a topic.
// Plugins may only publish to plugins.<their-own-pluginID>.* topics.
// The host may publish to any topic.
func (s *HostPluginServer) Publish(ctx context.Context, req *pb.PublishRequest) (*pb.Empty, error) {
	topic := req.Topic
	pluginID := PluginIDFromContext(ctx)

	// Validate topic
	if !isValidTopic(topic) {
		return nil, status.Error(codes.InvalidArgument, "invalid topic format")
	}

	s.mu.RLock()
	stopped := s.stopped
	s.mu.RUnlock()
	if stopped {
		return nil, status.Error(codes.Unavailable, "server is shutting down")
	}

	// Authorization check: plugins can only publish under plugins.<their-pluginID>.*
	// Reserved namespaces (cluster.*, namespaces.*) are host-only.
	var allowedPrefix string
	if pluginID != "" {
		if isHostOwnedTopic(topic) {
			return nil, status.Error(codes.PermissionDenied, "plugins cannot publish to reserved namespaces")
		}
		allowedPrefix = fmt.Sprintf("plugins.%s.", pluginID)
		if !strings.HasPrefix(topic, allowedPrefix) {
			return nil, status.Error(codes.PermissionDenied, "plugins can only publish to their own namespace")
		}
	}

	// Create pub/sub message
	msg := &pb.PubSubMessage{
		Topic:       topic,
		Source:      pluginID,
		Timestamp:   time.Now().Format(time.RFC3339),
		PayloadJson: req.PayloadJson,
	}

	// Publish to all subscribers (non-blocking, buffer-1, drop-oldest)
	s.broker.publish(topic, msg)

	// Update last-message cache only for host-owned topics
	if isHostOwnedTopic(topic) {
		s.broker.setLastMessage(topic, msg)
	}

	// Route ack sink publishes to any PublishAndAwaitAck call blocked on this
	// requestID, instead of (also) bridging them to the frontend as a plugin event
	// below — an ack is host-internal bookkeeping, not something the UI cares about.
	if isAckTopic(topic) {
		var ack struct {
			RequestID string `json:"requestId"`
		}
		if err := json.Unmarshal([]byte(req.PayloadJson), &ack); err != nil {
			log.Printf("warning: unmarshal ack payload on topic %q: %v", topic, err)
			return &pb.Empty{}, nil
		}
		s.mu.RLock()
		ch, ok := s.ackWaiters[ack.RequestID]
		s.mu.RUnlock()
		if ok {
			select {
			case ch <- struct{}{}:
			default:
			}
		}
		return &pb.Empty{}, nil
	}

	// Bridge plugin-owned events to the frontend via Wails event emission.
	// Only emit for plugin-published events (pluginID != ""), not host-originated publishes.
	if pluginID != "" {
		eventName := strings.TrimPrefix(topic, allowedPrefix)

		// Unmarshal the payload JSON into an any type.
		// If PayloadJson is empty, treat payload as nil (skip unmarshaling).
		// If unmarshal fails, log a warning and set payload to nil (don't fail the RPC).
		var payload any
		if req.PayloadJson != "" {
			if err := json.Unmarshal([]byte(req.PayloadJson), &payload); err != nil {
				log.Printf("warning: failed to unmarshal payload for topic %q: %v", topic, err)
				payload = nil
			}
		}

		// Re-check stopped immediately before emitting: broker.publish above is
		// harmless post-shutdown (subscribers already torn down drop it), but
		// eventEmitFn drives wailsruntime.EventsEmit against the app context, so
		// avoid firing it once shutdown has been signaled.
		s.mu.RLock()
		stopped := s.stopped
		s.mu.RUnlock()

		// eventEmitFn is set once in NewHostPluginServer and never reassigned,
		// so reading it here without holding s.mu is safe.
		if !stopped && s.eventEmitFn != nil {
			s.eventEmitFn(map[string]any{
				"pluginId":  pluginID,
				"eventName": eventName,
				"payload":   payload,
			})
		}
	}

	return &pb.Empty{}, nil
}

// PublishToHost is called by host-internal code to publish cluster/namespace changes.
// It publishes to the broker without going through the plugin-facing gRPC RPC.
// Returns false if the topic is invalid or the server is shutting down.
func (s *HostPluginServer) PublishToHost(topic string, payloadJSON string) bool {
	if !isValidTopic(topic) {
		return false
	}

	s.mu.RLock()
	stopped := s.stopped
	s.mu.RUnlock()
	if stopped {
		return false
	}

	msg := &pb.PubSubMessage{
		Topic:       topic,
		Source:      "host",
		Timestamp:   time.Now().Format(time.RFC3339),
		PayloadJson: payloadJSON,
	}

	s.broker.publish(topic, msg)

	// Cache for host-owned topics
	if isHostOwnedTopic(topic) {
		s.broker.setLastMessage(topic, msg)
	}
	return true
}

// PublishAndAwaitAck publishes payloadJSON (with a fresh "requestId" field merged in)
// to topic, then blocks until `expected` distinct "plugins.<id>.ack" publishes carrying
// that requestId arrive, or timeout elapses. Callers use this to know a pushed
// cluster-context/active-namespaces value was actually applied by every running
// plugin before proceeding — closing the race where a plugin's HTTP backend, reachable
// directly by its frontend bypassing the host, serves a business call before the
// host's async push has landed (see internal/app.Connect).
//
// expected is the caller's best-effort count of currently-running plugins: a plugin
// process could start or exit mid-wait, so this is bounded/fail-open, not a hard
// guarantee — callers must treat a return value below expected as "proceed anyway,
// but log a warning" rather than an error.
func (s *HostPluginServer) PublishAndAwaitAck(topic, payloadJSON string, expected int, timeout time.Duration) int {
	if expected <= 0 {
		s.PublishToHost(topic, payloadJSON)
		return 0
	}

	requestID := uuid.NewString()
	payload, err := mergeRequestID(payloadJSON, requestID)
	if err != nil {
		log.Printf("warning: merge requestId into payload for topic %q: %v", topic, err)
		s.PublishToHost(topic, payloadJSON)
		return 0
	}

	ch := make(chan struct{}, expected)
	s.mu.Lock()
	s.ackWaiters[requestID] = ch
	s.mu.Unlock()
	defer func() {
		s.mu.Lock()
		delete(s.ackWaiters, requestID)
		s.mu.Unlock()
	}()

	if !s.PublishToHost(topic, payload) {
		return 0
	}

	got := 0
	deadline := time.After(timeout)
	for got < expected {
		select {
		case <-ch:
			got++
		case <-deadline:
			return got
		}
	}
	return got
}

// mergeRequestID decodes payloadJSON as a JSON object, sets its "requestId" field,
// and re-encodes it. An empty payloadJSON is treated as "{}".
func mergeRequestID(payloadJSON, requestID string) (string, error) {
	m := map[string]any{}
	if payloadJSON != "" {
		if err := json.Unmarshal([]byte(payloadJSON), &m); err != nil {
			return "", fmt.Errorf("unmarshal payload: %w", err)
		}
	}
	m["requestId"] = requestID
	b, err := json.Marshal(m)
	if err != nil {
		return "", fmt.Errorf("marshal payload: %w", err)
	}
	return string(b), nil
}

// Broker helper methods

// registerSubscriber registers a subscriber for a topic and returns the subscriber ID and channel.
func (b *PubSubBroker) registerSubscriber(topic string) (int, chan *pb.PubSubMessage) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.topics[topic] == nil {
		b.topics[topic] = make(map[int]chan *pb.PubSubMessage)
		b.nextID[topic] = 0
	}

	subscriberID := b.nextID[topic]
	b.nextID[topic]++

	ch := make(chan *pb.PubSubMessage, 1)
	b.topics[topic][subscriberID] = ch

	return subscriberID, ch
}

// unregisterSubscriber removes a subscriber from a topic.
func (b *PubSubBroker) unregisterSubscriber(topic string, subscriberID int) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if subs, ok := b.topics[topic]; ok {
		if ch, ok := subs[subscriberID]; ok {
			close(ch)
			delete(subs, subscriberID)
		}
		if len(subs) == 0 {
			delete(b.topics, topic)
		}
	}
}

// publish publishes a message to all subscribers of a topic (non-blocking, drop-oldest on full).
func (b *PubSubBroker) publish(topic string, msg *pb.PubSubMessage) {
	// Hold the read lock for the entire send loop (sends are non-blocking via
	// select/default, so this is cheap) — this prevents unregisterSubscriber,
	// which takes the write lock, from closing a channel or mutating the
	// topic's subscriber map concurrently with this range/send.
	b.mu.RLock()
	defer b.mu.RUnlock()

	subs, ok := b.topics[topic]
	if !ok || len(subs) == 0 {
		return
	}

	for _, ch := range subs {
		select {
		case ch <- msg:
		default:
			// Channel full, drop oldest message and try again
			select {
			case <-ch:
			default:
			}
			select {
			case ch <- msg:
			default:
			}
		}
	}
}

// getLastMessage returns the last message for a topic (if cached).
func (b *PubSubBroker) getLastMessage(topic string) *pb.PubSubMessage {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.lastMessage[topic]
}

// setLastMessage caches the last message for a topic.
func (b *PubSubBroker) setLastMessage(topic string, msg *pb.PubSubMessage) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.lastMessage[topic] = msg
}

// MarkStopped marks the server as stopped, preventing new publishes.
func (s *HostPluginServer) MarkStopped() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.stopped = true
}
