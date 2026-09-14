package async

import (
	"context"
	"fmt"

	grpclib "google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

// NewAuthInterceptors returns unary and stream client interceptors that attach
// the authorization bearer token to every outgoing gRPC call.
func NewAuthInterceptors(token string) (grpclib.UnaryClientInterceptor, grpclib.StreamClientInterceptor) {
	unary := func(
		ctx context.Context,
		method string,
		req, reply interface{},
		cc *grpclib.ClientConn,
		invoker grpclib.UnaryInvoker,
		opts ...grpclib.CallOption,
	) error {
		ctx = metadata.AppendToOutgoingContext(ctx, "authorization", fmt.Sprintf("bearer %s", token))
		return invoker(ctx, method, req, reply, cc, opts...)
	}

	stream := func(
		ctx context.Context,
		desc *grpclib.StreamDesc,
		cc *grpclib.ClientConn,
		method string,
		streamer grpclib.Streamer,
		opts ...grpclib.CallOption,
	) (grpclib.ClientStream, error) {
		ctx = metadata.AppendToOutgoingContext(ctx, "authorization", fmt.Sprintf("bearer %s", token))
		return streamer(ctx, desc, cc, method, opts...)
	}

	return unary, stream
}
