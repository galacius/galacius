package app

import (
	"net/url"
	"time"

	"github.com/galacius/galacius/internal/proxy"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// proxyDialAddr extracts a host:port to poll as a setup-command readiness
// fallback from the cluster's configured proxy. Prefers httpsProxy since
// that's what actually routes Kubernetes API traffic (HTTPS); falls back to
// httpProxy. Returns "" if neither is set or parseable.
func proxyDialAddr(httpProxy, httpsProxy string) string {
	raw := httpsProxy
	if raw == "" {
		raw = httpProxy
	}
	if raw == "" {
		return ""
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return ""
	}
	return u.Host
}

// ensureProxyManager returns the ProxyManager for contextName, creating one on
// first use. If a manager already exists but was configured with a different
// command or proxy address (the user edited setup command/proxy in settings),
// the stale manager is stopped and replaced with a fresh one.
// healthCheckIntervalSeconds is applied to the returned manager either way
// (new or reused); <= 0 leaves the manager's built-in default untouched.
func (a *App) ensureProxyManager(contextName, command, httpProxy, httpsProxy string, healthCheckIntervalSeconds int) *proxy.Manager {
	proxyAddr := proxyDialAddr(httpProxy, httpsProxy)

	a.proxyManagersMu.RLock()
	if m, exists := a.proxyManagers[contextName]; exists {
		unchanged := m.Command() == command && m.ProxyAddr() == proxyAddr
		a.proxyManagersMu.RUnlock()
		if unchanged {
			applyHealthCheckInterval(m, healthCheckIntervalSeconds)
			return m
		}
		m.Stop()
		a.proxyManagersMu.Lock()
		delete(a.proxyManagers, contextName)
		a.proxyManagersMu.Unlock()
	} else {
		a.proxyManagersMu.RUnlock()
	}

	a.proxyManagersMu.Lock()
	defer a.proxyManagersMu.Unlock()

	if m, exists := a.proxyManagers[contextName]; exists {
		if m.Command() == command && m.ProxyAddr() == proxyAddr {
			applyHealthCheckInterval(m, healthCheckIntervalSeconds)
			return m
		}
		m.Stop()
		delete(a.proxyManagers, contextName)
	}

	m := proxy.NewManager(contextName, command, proxyAddr, func(eventName, message string) {
		wailsruntime.EventsEmit(a.ctx, eventName, map[string]string{
			"context": contextName,
			"message": message,
		})
	})
	applyHealthCheckInterval(m, healthCheckIntervalSeconds)
	a.proxyManagers[contextName] = m
	return m
}

func applyHealthCheckInterval(m *proxy.Manager, seconds int) {
	if seconds <= 0 {
		return
	}
	m.SetHealthCheckInterval(time.Duration(seconds) * time.Second)
}

// GetProxyStatus returns the current setup-command proxy status for
// contextName, for the frontend to display without waiting for an event.
// Returns an idle status if no manager has been created for this context yet
// (e.g. the cluster has no setup command configured).
func (a *App) GetProxyStatus(contextName string) proxy.Status {
	a.proxyManagersMu.RLock()
	mgr, exists := a.proxyManagers[contextName]
	a.proxyManagersMu.RUnlock()
	if !exists {
		return proxy.Status{State: proxy.Idle.String()}
	}
	return mgr.Status()
}

// stopProxyManager stops and forgets the ProxyManager for contextName, if one
// exists. Called when Connect() switches to a different cluster context.
func (a *App) stopProxyManager(contextName string) {
	a.proxyManagersMu.RLock()
	mgr, exists := a.proxyManagers[contextName]
	a.proxyManagersMu.RUnlock()
	if exists {
		mgr.Stop()
	}
}

// stopAllProxyManagers stops every tracked ProxyManager. Called on app
// shutdown so no setup-command subprocess is left running after the app exits.
func (a *App) stopAllProxyManagers() {
	a.proxyManagersMu.Lock()
	for _, mgr := range a.proxyManagers {
		mgr.Stop()
	}
	a.proxyManagersMu.Unlock()
}
