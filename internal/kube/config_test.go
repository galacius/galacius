package kube

import (
	"os"
	"path/filepath"
	"testing"
)

// TestLoadingRules_WithEmptyPaths returns default rules.
func TestLoadingRules_WithEmptyPaths(t *testing.T) {
	rules := LoadingRules([]string{})
	if rules == nil {
		t.Fatalf("expected non-nil rules for empty paths")
	}
	if len(rules.Precedence) == 0 {
		t.Fatalf("expected default rules to have Precedence set")
	}
}

// TestLoadingRules_WithCustomPaths sets Precedence to the given paths.
func TestLoadingRules_WithCustomPaths(t *testing.T) {
	paths := []string{"/path/to/config1", "/path/to/config2"}
	rules := LoadingRules(paths)
	if rules == nil {
		t.Fatalf("expected non-nil rules")
	}
	if len(rules.Precedence) != len(paths) {
		t.Fatalf("expected Precedence to have %d paths, got %d", len(paths), len(rules.Precedence))
	}
	for i, p := range paths {
		if rules.Precedence[i] != p {
			t.Fatalf("expected path %d to be %s, got %s", i, p, rules.Precedence[i])
		}
	}
}

// TestListContexts_WithSingleContext returns a sorted list with one context.
func TestListContexts_WithSingleContext(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "kubeconfig")

	kubeconfig := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: cluster-a
contexts:
- context:
    cluster: cluster-a
    user: user-a
  name: context-a
current-context: context-a
users:
- name: user-a
  user:
    token: token-a
`
	if err := os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0600); err != nil {
		t.Fatalf("failed to write kubeconfig: %v", err)
	}

	contexts, err := ListContexts([]string{kubeconfigPath})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(contexts) != 1 {
		t.Fatalf("expected 1 context, got %d", len(contexts))
	}
	if contexts[0] != "context-a" {
		t.Fatalf("expected context name 'context-a', got %s", contexts[0])
	}
}

// TestListContexts_WithMultipleContexts returns a sorted list.
func TestListContexts_WithMultipleContexts(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "kubeconfig")

	kubeconfig := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://cluster-a.example.com
  name: cluster-a
- cluster:
    server: https://cluster-b.example.com
  name: cluster-b
- cluster:
    server: https://cluster-c.example.com
  name: cluster-c
contexts:
- context:
    cluster: cluster-b
    user: user-b
  name: context-b
- context:
    cluster: cluster-a
    user: user-a
  name: context-a
- context:
    cluster: cluster-c
    user: user-c
  name: context-c
current-context: context-a
users:
- name: user-a
  user:
    token: token-a
- name: user-b
  user:
    token: token-b
- name: user-c
  user:
    token: token-c
`
	if err := os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0600); err != nil {
		t.Fatalf("failed to write kubeconfig: %v", err)
	}

	contexts, err := ListContexts([]string{kubeconfigPath})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(contexts) != 3 {
		t.Fatalf("expected 3 contexts, got %d", len(contexts))
	}

	expected := []string{"context-a", "context-b", "context-c"}
	for i, ctx := range contexts {
		if ctx != expected[i] {
			t.Fatalf("expected contexts to be sorted; at index %d expected %s, got %s", i, expected[i], ctx)
		}
	}
}

// TestListContexts_WithNonexistentFile returns empty contexts list when file doesn't exist.
// The clientcmd package returns an empty config rather than an error for missing files.
func TestListContexts_WithNonexistentFile(t *testing.T) {
	contexts, err := ListContexts([]string{"/nonexistent/kubeconfig"})
	if err != nil {
		t.Fatalf("unexpected error for nonexistent file: %v", err)
	}
	if len(contexts) != 0 {
		t.Fatalf("expected empty contexts list for nonexistent file, got %d", len(contexts))
	}
}

// TestListContexts_WithNoContexts returns an empty slice when kubeconfig has no contexts.
func TestListContexts_WithNoContexts(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "kubeconfig")

	kubeconfig := `apiVersion: v1
kind: Config
clusters: []
contexts: []
current-context: ""
users: []
`
	if err := os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0600); err != nil {
		t.Fatalf("failed to write kubeconfig: %v", err)
	}

	contexts, err := ListContexts([]string{kubeconfigPath})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(contexts) != 0 {
		t.Fatalf("expected 0 contexts, got %d", len(contexts))
	}
}

// TestCurrentContext_WithSetCurrentContext returns the current-context field.
func TestCurrentContext_WithSetCurrentContext(t *testing.T) {
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

	currentCtx, err := CurrentContext([]string{kubeconfigPath})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if currentCtx != "test-context" {
		t.Fatalf("expected current context 'test-context', got %s", currentCtx)
	}
}

// TestCurrentContext_WithEmptyCurrentContext returns an empty string when not set.
func TestCurrentContext_WithEmptyCurrentContext(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "kubeconfig")

	kubeconfig := `apiVersion: v1
kind: Config
clusters: []
contexts: []
current-context: ""
users: []
`
	if err := os.WriteFile(kubeconfigPath, []byte(kubeconfig), 0600); err != nil {
		t.Fatalf("failed to write kubeconfig: %v", err)
	}

	currentCtx, err := CurrentContext([]string{kubeconfigPath})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if currentCtx != "" {
		t.Fatalf("expected empty current context, got %s", currentCtx)
	}
}

// TestCurrentContext_WithNonexistentFile returns empty string when file doesn't exist.
// The clientcmd package returns an empty config rather than an error for missing files.
func TestCurrentContext_WithNonexistentFile(t *testing.T) {
	ctx, err := CurrentContext([]string{"/nonexistent/kubeconfig"})
	if err != nil {
		t.Fatalf("unexpected error for nonexistent file: %v", err)
	}
	if ctx != "" {
		t.Fatalf("expected empty current context for nonexistent file, got %s", ctx)
	}
}

// TestCurrentContext_WithMultiplePaths uses the first valid kubeconfig.
func TestCurrentContext_WithMultiplePaths(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath1 := filepath.Join(tempDir, "kubeconfig1")
	kubeconfigPath2 := filepath.Join(tempDir, "kubeconfig2")

	kubeconfig1 := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: cluster1
contexts:
- context:
    cluster: cluster1
    user: user1
  name: context1
current-context: context1
users:
- name: user1
  user:
    token: token1
`
	kubeconfig2 := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://127.0.0.2:6443
  name: cluster2
contexts:
- context:
    cluster: cluster2
    user: user2
  name: context2
current-context: context2
users:
- name: user2
  user:
    token: token2
`
	if err := os.WriteFile(kubeconfigPath1, []byte(kubeconfig1), 0600); err != nil {
		t.Fatalf("failed to write kubeconfig1: %v", err)
	}
	if err := os.WriteFile(kubeconfigPath2, []byte(kubeconfig2), 0600); err != nil {
		t.Fatalf("failed to write kubeconfig2: %v", err)
	}

	// First path in precedence should be used
	currentCtx, err := CurrentContext([]string{kubeconfigPath1, kubeconfigPath2})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if currentCtx != "context1" {
		t.Fatalf("expected current context from first kubeconfig, got %s", currentCtx)
	}
}

// TestListContexts_WithMalformedYAML verifies that ListContexts returns an error
// when the kubeconfig file contains malformed YAML.
func TestListContexts_WithMalformedYAML(t *testing.T) {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "kubeconfig")
	malformed := "this: is: not: valid: yaml: [unterminated"
	if err := os.WriteFile(kubeconfigPath, []byte(malformed), 0o644); err != nil {
		t.Fatalf("failed to write kubeconfig: %v", err)
	}

	_, err := ListContexts([]string{kubeconfigPath})
	if err == nil {
		t.Fatal("expected error for malformed YAML kubeconfig, got nil")
	}
}
