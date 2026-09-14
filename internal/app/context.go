package app

import (
	"sort"

	"github.com/galacius/galacius/internal/kube"
	corekube "github.com/galacius/galacius/packages/core/kube"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"k8s.io/client-go/tools/clientcmd"
)

// GetContexts returns all kubeconfig context names across all synced kubeconfig files.
func (a *App) GetContexts() ([]string, error) {
	a.mu.RLock()
	paths := a.settings.KubeconfigPaths
	a.mu.RUnlock()
	return kube.ListContexts(paths)
}

// GetCurrentContext returns the current-context from the synced kubeconfig files.
func (a *App) GetCurrentContext() (string, error) {
	a.mu.RLock()
	paths := a.settings.KubeconfigPaths
	a.mu.RUnlock()
	return kube.CurrentContext(paths)
}

// GetContextsGrouped returns context names grouped by the kubeconfig file that defines them.
// Files that define no contexts or cannot be read are omitted.
func (a *App) GetContextsGrouped() ([]dto.KubeconfigGroup, error) {
	a.mu.RLock()
	paths := a.settings.KubeconfigPaths
	a.mu.RUnlock()

	rules := corekube.LoadingRules(paths)
	groups := make([]dto.KubeconfigGroup, 0)
	for _, path := range rules.Precedence {
		cfg, err := clientcmd.LoadFromFile(path)
		if err != nil {
			continue
		}
		names := make([]string, 0, len(cfg.Contexts))
		for name := range cfg.Contexts {
			names = append(names, name)
		}
		if len(names) == 0 {
			continue
		}
		sort.Strings(names)
		groups = append(groups, dto.KubeconfigGroup{KubeconfigPath: path, Contexts: names})
	}
	return groups, nil
}
