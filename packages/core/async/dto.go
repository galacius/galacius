package async

import "context"

// EventTopic identifies a host<->plugin pub/sub topic over the gRPC
// PublishToHost/Subscribe channel.
type EventTopic string

const (
	// EventTopicClusterContext carries the active cluster context and its
	// kubeconfig path, pushed by the host on every cluster switch.
	EventTopicClusterContext EventTopic = "cluster.context"
	// EventTopicNamespacesActive carries the active namespace filter, pushed
	// by the host on every namespace-filter change.
	EventTopicNamespacesActive EventTopic = "namespaces.active"
)

// ClusterContextEvent represents the payload of a cluster context change event.
type ClusterContextEvent struct {
	// RequestID, when non-empty, asks the plugin to publish an ack (see
	// GrpcClient.Emit and HostPluginServer.PublishAndAwaitAck) back to
	// "plugins.<id>.ack" once this event has been applied.
	RequestID string `json:"requestId,omitempty"`
	// Clearing, when true, tells the plugin to drop its cached context label
	// (ContextName/KubeconfigPath are empty and ignored) rather than apply one —
	// the host sends this as the first step of a cluster switch, before it has
	// resolved the new context, so no in-flight business call can read a stale
	// label as if it were still current. See internal/app.Connect (host repo).
	Clearing       bool   `json:"clearing,omitempty"`
	ContextName    string `json:"contextName"`
	KubeconfigPath string `json:"kubeconfigPath"`
}

// ActiveNamespacesEvent represents the payload of an active namespaces change event.
type ActiveNamespacesEvent struct {
	// RequestID, when non-empty, asks the plugin to publish an ack (see
	// GrpcClient.Emit and HostPluginServer.PublishAndAwaitAck) back to
	// "plugins.<id>.ack" once this event has been applied.
	RequestID string `json:"requestId,omitempty"`
	// Clearing, when true, tells the plugin to drop its cached namespace filter
	// (Namespaces is empty and ignored) rather than apply one — see
	// ClusterContextEvent.Clearing.
	Clearing   bool     `json:"clearing,omitempty"`
	Namespaces []string `json:"namespaces"`
}

// EventReceiver is satisfied by any type implementing the driven ports for plugin
// event routes.
type EventReceiver interface {
	// SyncClusterContext syncs a cluster context update received from the host.
	SyncClusterContext(ctx context.Context, contextName, kubeconfigPath string) error
	// SyncActiveNamespaces syncs an active-namespaces update received from the host.
	SyncActiveNamespaces(ctx context.Context, namespaces []string) error
	// ClearActiveContext drops the cached context label ahead of a switch (see
	// ClusterContextEvent.Clearing).
	ClearActiveContext(ctx context.Context) error
	// ClearActiveNamespaces drops the cached namespace filter ahead of a switch
	// (see ActiveNamespacesEvent.Clearing).
	ClearActiveNamespaces(ctx context.Context) error
}
