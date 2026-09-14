package plugin

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestPluginAssetHandlerServesDistIndex(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)

	distDir := filepath.Join(home, ".galacius", "plugins", "helm", "dist")
	if err := os.MkdirAll(distDir, 0o755); err != nil {
		t.Fatal(err)
	}
	const bundle = "/* bundle */"
	if err := os.WriteFile(filepath.Join(distDir, "index.js"), []byte(bundle), 0o644); err != nil {
		t.Fatal(err)
	}

	h := NewPluginAssetHandler(func(pluginID string) (string, bool) {
		return filepath.Join(home, ".galacius", "plugins", pluginID), true
	})
	req := httptest.NewRequest("GET", "/api/plugins/helm/dist/index.js?v=abc123", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if w.Body.String() != bundle {
		t.Fatalf("expected body %q, got %q", bundle, w.Body.String())
	}
}

func TestPluginAssetHandlerRejectsPathTraversal(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)

	distDir := filepath.Join(home, ".galacius", "plugins", "helm", "dist")
	if err := os.MkdirAll(distDir, 0o755); err != nil {
		t.Fatal(err)
	}

	h := NewPluginAssetHandler(func(pluginID string) (string, bool) {
		return filepath.Join(home, ".galacius", "plugins", pluginID), true
	})
	req := httptest.NewRequest("GET", "/api/plugins/helm/../../../etc/passwd", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != 403 {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestPluginAssetHandlerServesFromMismatchedDirName(t *testing.T) {
	root := t.TempDir()
	distDir := filepath.Join(root, ".output", "dist")
	if err := os.MkdirAll(distDir, 0o755); err != nil {
		t.Fatal(err)
	}
	const bundle = "/* bundle */"
	if err := os.WriteFile(filepath.Join(distDir, "index.js"), []byte(bundle), 0o644); err != nil {
		t.Fatal(err)
	}

	// pluginID "helm" resolves to a directory named ".output", not "helm" —
	// mirrors a local dev build (restoreInstalledPlugins allows dirName != pluginID).
	h := NewPluginAssetHandler(func(pluginID string) (string, bool) {
		if pluginID != "helm" {
			return "", false
		}
		return filepath.Join(root, ".output"), true
	})
	req := httptest.NewRequest("GET", "/api/plugins/helm/dist/index.js", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if w.Body.String() != bundle {
		t.Fatalf("expected body %q, got %q", bundle, w.Body.String())
	}
}

func TestPluginAssetHandlerUnknownPluginReturns404(t *testing.T) {
	h := NewPluginAssetHandler(func(pluginID string) (string, bool) { return "", false })
	req := httptest.NewRequest("GET", "/api/plugins/unknown/dist/index.js", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != 404 {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}
