package kube

import (
	"context"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"k8s.io/apimachinery/pkg/runtime"
	fakediscovery "k8s.io/client-go/discovery/fake"
	"k8s.io/client-go/kubernetes/fake"
	clienttesting "k8s.io/client-go/testing"
)

// TestPing_ValidServer verifies Ping succeeds when the discovery client
// can fetch a server version.
func TestPing_ValidServer(t *testing.T) {
	cs := fake.NewSimpleClientset()

	if err := Ping(context.Background(), cs); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

// TestPing_UnreachableServer verifies Ping surfaces the error when the
// discovery call fails (e.g. API server unreachable).
func TestPing_UnreachableServer(t *testing.T) {
	cs := fake.NewSimpleClientset()
	cs.Discovery().(*fakediscovery.FakeDiscovery).PrependReactor("get", "version", func(action clienttesting.Action) (bool, runtime.Object, error) {
		return true, nil, errors.New("connection refused")
	})

	if err := Ping(context.Background(), cs); err == nil {
		t.Fatal("expected error when server is unreachable, got nil")
	}
}

// TestPing_TimesOutWhenServerHangs verifies Ping returns an error (rather
// than blocking forever) when the discovery call never returns — e.g. a
// proxy that accepts the connection but never replies.
func TestPing_TimesOutWhenServerHangs(t *testing.T) {
	cs := fake.NewSimpleClientset()
	block := make(chan struct{})
	t.Cleanup(func() { close(block) })
	cs.Discovery().(*fakediscovery.FakeDiscovery).PrependReactor("get", "version", func(action clienttesting.Action) (bool, runtime.Object, error) {
		<-block
		return true, nil, nil
	})

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	if err := Ping(ctx, cs); err == nil {
		t.Fatal("expected timeout error when server hangs, got nil")
	}
}

// TestProxyFunc_HTTPSWithHTTPSProxy verifies that https requests use httpsProxy when set.
func TestProxyFunc_HTTPSWithHTTPSProxy(t *testing.T) {
	httpsProxy := "https://proxy.example.com:8443"
	pf := ProxyFunc("", httpsProxy)

	req, _ := http.NewRequest("GET", "https://api.k8s.example.com/api/v1/pods", nil)
	u, err := pf(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u == nil {
		t.Fatalf("expected proxy URL, got nil")
	}
	if u.String() != httpsProxy {
		t.Fatalf("expected %s, got %s", httpsProxy, u.String())
	}
}

// TestProxyFunc_HTTPWithHTTPProxy verifies that http requests use httpProxy when set.
func TestProxyFunc_HTTPWithHTTPProxy(t *testing.T) {
	httpProxy := "http://proxy.example.com:8080"
	pf := ProxyFunc(httpProxy, "")

	req, _ := http.NewRequest("GET", "http://api.k8s.example.com/api/v1/pods", nil)
	u, err := pf(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u == nil {
		t.Fatalf("expected proxy URL, got nil")
	}
	if u.String() != httpProxy {
		t.Fatalf("expected %s, got %s", httpProxy, u.String())
	}
}

// TestProxyFunc_HTTPSFallsBackToHTTPProxy verifies that https requests fall back
// to httpProxy when httpsProxy is not set.
func TestProxyFunc_HTTPSFallsBackToHTTPProxy(t *testing.T) {
	httpProxy := "http://proxy.example.com:8080"
	pf := ProxyFunc(httpProxy, "")

	req, _ := http.NewRequest("GET", "https://api.k8s.example.com/api/v1/pods", nil)
	u, err := pf(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u == nil {
		t.Fatalf("expected proxy URL, got nil")
	}
	if u.String() != httpProxy {
		t.Fatalf("expected %s, got %s", httpProxy, u.String())
	}
}

// TestProxyFunc_NoProxiesReturnsNil verifies that when both proxies are empty,
// nil is returned.
func TestProxyFunc_NoProxiesReturnsNil(t *testing.T) {
	pf := ProxyFunc("", "")

	req, _ := http.NewRequest("GET", "https://api.k8s.example.com/api/v1/pods", nil)
	u, err := pf(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u != nil {
		t.Fatalf("expected nil, got %s", u.String())
	}
}

// TestProxyFunc_InvalidProxyURLReturnsError verifies that an invalid proxy URL
// causes url.Parse to return an error.
func TestProxyFunc_InvalidProxyURLReturnsError(t *testing.T) {
	invalidProxy := ":::invalid:::"
	pf := ProxyFunc(invalidProxy, "")

	req, _ := http.NewRequest("GET", "http://api.k8s.example.com/api/v1/pods", nil)
	_, err := pf(req)
	if err == nil {
		t.Fatalf("expected error for invalid proxy URL, got nil")
	}
}

// TestProxyFunc_HTTPSProxyTakesPrecedenceOverHTTPProxy verifies that when both
// proxies are set, https requests use httpsProxy (not httpProxy).
func TestProxyFunc_HTTPSProxyTakesPrecedenceOverHTTPProxy(t *testing.T) {
	httpProxy := "http://proxy.example.com:8080"
	httpsProxy := "https://proxy.example.com:8443"
	pf := ProxyFunc(httpProxy, httpsProxy)

	req, _ := http.NewRequest("GET", "https://api.k8s.example.com/api/v1/pods", nil)
	u, err := pf(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u == nil {
		t.Fatalf("expected proxy URL, got nil")
	}
	if u.String() != httpsProxy {
		t.Fatalf("expected %s, got %s", httpsProxy, u.String())
	}
}

// TestNewClientset_WithValidContextName verifies NewClientset succeeds when
// given a valid context name from a temp kubeconfig file.
func TestNewClientset_WithValidContextName(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "kubeconfig")

	kubeconfig := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
users:
- name: test-user
  user:
    token: fake-token
`
	if err := os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0600); err != nil {
		t.Fatalf("failed to write kubeconfig: %v", err)
	}

	cs, cfg, err := NewClientset("test-context", "", "", []string{kubeconfigPath})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cs == nil {
		t.Fatalf("expected clientset, got nil")
	}
	if cfg == nil {
		t.Fatalf("expected rest.Config, got nil")
	}
}

// TestNewClientset_WithInvalidContextName verifies NewClientset returns an error
// when given a context name that doesn't exist in the kubeconfig.
func TestNewClientset_WithInvalidContextName(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "kubeconfig")

	kubeconfig := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
users:
- name: test-user
  user:
    token: fake-token
`
	if err := os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0600); err != nil {
		t.Fatalf("failed to write kubeconfig: %v", err)
	}

	cs, cfg, err := NewClientset("nonexistent-context", "", "", []string{kubeconfigPath})
	if err == nil {
		t.Fatalf("expected error for nonexistent context, got nil")
	}
	if cs != nil {
		t.Fatalf("expected nil clientset on error, got %v", cs)
	}
	if cfg != nil {
		t.Fatalf("expected nil rest.Config on error, got %v", cfg)
	}
}

// TestNewClientset_WithNonexistentKubeconfigPath verifies NewClientset returns
// an error when the kubeconfig file doesn't exist.
func TestNewClientset_WithNonexistentKubeconfigPath(t *testing.T) {
	cs, cfg, err := NewClientset("test-context", "", "", []string{"/nonexistent/kubeconfig"})
	if err == nil {
		t.Fatalf("expected error for nonexistent kubeconfig, got nil")
	}
	if cs != nil {
		t.Fatalf("expected nil clientset on error, got %v", cs)
	}
	if cfg != nil {
		t.Fatalf("expected nil rest.Config on error, got %v", cfg)
	}
}

// TestNewClientset_ProxyFuncIsConfigured verifies that when proxies are set,
// they are installed in the returned rest.Config.
func TestNewClientset_ProxyFuncIsConfigured(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "kubeconfig")

	kubeconfig := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
users:
- name: test-user
  user:
    token: fake-token
`
	if err := os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0600); err != nil {
		t.Fatalf("failed to write kubeconfig: %v", err)
	}

	httpProxy := "http://proxy.example.com:8080"
	httpsProxy := "https://proxy.example.com:8443"
	cs, cfg, err := NewClientset("test-context", httpProxy, httpsProxy, []string{kubeconfigPath})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cs == nil {
		t.Fatalf("expected clientset, got nil")
	}
	if cfg == nil {
		t.Fatalf("expected rest.Config, got nil")
	}
	if cfg.Proxy == nil {
		t.Fatalf("expected Proxy func to be configured, got nil")
	}

	// Verify the proxy function works as expected
	req, _ := http.NewRequest("GET", "https://api.k8s.example.com/api/v1/pods", nil)
	u, err := cfg.Proxy(req)
	if err != nil {
		t.Fatalf("unexpected error calling proxy func: %v", err)
	}
	if u == nil || u.String() != httpsProxy {
		t.Fatalf("expected proxy func to return %s, got %v", httpsProxy, u)
	}
}

// TestNewClientset_WithEmptyProxiesReturnsValidConfig verifies that empty proxy
// strings result in a valid config (no panic, no error).
func TestNewClientset_WithEmptyProxiesReturnsValidConfig(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "kubeconfig")

	kubeconfig := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-user
  name: test-context
current-context: test-context
users:
- name: test-user
  user:
    token: fake-token
`
	if err := os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0600); err != nil {
		t.Fatalf("failed to write kubeconfig: %v", err)
	}

	cs, cfg, err := NewClientset("test-context", "", "", []string{kubeconfigPath})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cs == nil {
		t.Fatalf("expected clientset, got nil")
	}
	if cfg == nil {
		t.Fatalf("expected rest.Config, got nil")
	}
}
