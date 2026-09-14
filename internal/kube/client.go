package kube

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// Ping verifies the API server is reachable by fetching the server version.
// ServerVersion() has no context/deadline of its own, so it's run in a
// goroutine and raced against ctx: without this, a proxy that accepts the
// TCP connection but never replies (e.g. a setup command's SSO-backed proxy
// that reports ready a moment before it's actually forwarding traffic) hangs
// Ping forever, and with it the Connect() call awaiting this result.
func Ping(ctx context.Context, cs kubernetes.Interface) error {
	errCh := make(chan error, 1)
	go func() {
		_, err := cs.Discovery().ServerVersion()
		errCh <- err
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		return fmt.Errorf("timed out waiting for API server: %w", ctx.Err())
	}
}

// NewClientset builds a Kubernetes clientset for the given context.
// httpProxy / httpsProxy route API-server traffic through a proxy when set
// (e.g. EKS behind a corporate proxy). Pass empty strings for a direct connection.
// kubeconfigPaths lists the kubeconfig files to load; pass nil to use the default rules.
func NewClientset(contextName, httpProxy, httpsProxy string, kubeconfigPaths []string) (*kubernetes.Clientset, *rest.Config, error) {
	restConfig, err := RestConfigForContext(contextName, httpProxy, httpsProxy, kubeconfigPaths)
	if err != nil {
		return nil, nil, err
	}

	// client-go defaults to QPS:5/Burst:10 when unset, which throttles this
	// app's own requests. Connect() starts ~9 cluster-wide informers plus,
	// per selected namespace, one informer for each of the ~24
	// namespace-scoped (nsscope) resource kinds — e.g. 7 namespaces selected
	// means ~168 informers all doing their initial LIST at once. Raise the
	// ceiling well above kubectl/Lens/k9s-style single-digit-namespace usage
	// so that burst doesn't self-throttle into spurious sync timeouts.
	restConfig.QPS = 100
	restConfig.Burst = 300

	cs, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, nil, err
	}
	return cs, restConfig, nil
}

// ProxyFunc returns a proxy selector for rest.Config.Proxy / http.Transport.Proxy.
// Values are captured at call time; the returned function is goroutine-safe.
func ProxyFunc(httpProxy, httpsProxy string) func(*http.Request) (*url.URL, error) {
	return func(req *http.Request) (*url.URL, error) {
		if req.URL.Scheme == "https" && httpsProxy != "" {
			return url.Parse(httpsProxy)
		}
		if httpProxy != "" {
			return url.Parse(httpProxy)
		}
		return nil, nil
	}
}
