package async

import (
	"fmt"
	"os"
	"time"
)

// EventRoute is the non-generic handle stored by EventDispatcher. Each concrete
// eventRoute[T] closes over its own T at construction, so Run() needs no type assertion.
type EventRoute interface {
	Run(grpcAddr, authToken string)
}

type EventHandler[T any] func(event *T) error
type Deserializer[T any] func([]byte) (*T, error)

func NewRoute[T any](topic string, handler EventHandler[T], deserializer Deserializer[T]) EventRoute {
	return &eventRoute[T]{
		topic:        topic,
		handler:      handler,
		deserializer: deserializer,
	}
}

type eventRoute[T any] struct {
	topic        string
	handler      EventHandler[T]
	deserializer Deserializer[T]
}

func (r *eventRoute[T]) Run(grpcAddr, authToken string) {
	r.runEventLoop(grpcAddr, authToken)
}

// runEventLoop owns gRPC dial/subscribe + exponential-backoff reconnection — ported verbatim
// from WatchClusterContext/WatchActiveNamespaces. Dials its OWN dedicated GrpcClient per
// call, preserving the existing invariant that the two watch loops must never share one
// GrpcClient instance (Dial() closes/replaces the instance's live connection).
func (r *eventRoute[T]) runEventLoop(grpcAddr, authToken string) {
	br := NewBackoffReconnector()
	client := &GrpcClient{}

	for {
		stream, err := client.DialAndSubscribe(grpcAddr, r.topic, authToken)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			time.Sleep(br.OnDialError())
			continue
		}
		br.OnConnected()

		streamErr := r.processStream(stream)
		fmt.Fprintf(os.Stderr, "error: %s watch stream: %v\n", r.topic, streamErr)
		client.Close()

		time.Sleep(br.OnStreamError())
	}
}

// processStream mirrors ProcessWatchStream's error handling: a handler error is logged but
// does not stop the loop; the loop only exits when Recv() itself errors.
func (r *eventRoute[T]) processStream(stream SubscribeStream) error {
	for {
		msg, err := stream.Recv()
		if err != nil {
			return err
		}
		event, err := r.deserializer([]byte(msg.PayloadJson))
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: deserialize event on topic: %v\n", err)
			continue
		}
		if err := r.handler(event); err != nil {
			fmt.Fprintf(os.Stderr, "error: handle event: %v\n", err)
		}
	}
}
