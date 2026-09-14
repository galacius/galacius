package config

import (
	"fmt"
	"runtime/debug"
)

func WailsModuleVersion() string {
	return moduleVersion("github.com/wailsapp/wails/v2")
}

// ClientGoModuleVersion returns the version of k8s.io/client-go the app was
// built against — the library actually used to talk to the Kubernetes API,
// so it's more meaningful to surface than the k8s.io/api types module.
func ClientGoModuleVersion() string {
	return moduleVersion("k8s.io/client-go")
}

func moduleVersion(path string) string {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return ""
	}
	for _, dep := range info.Deps {
		if dep.Path == path {
			return dep.Version
		}
	}
	return ""
}

func FormatBytes(b int64) string {
	if b <= 0 {
		return ""
	}
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}
