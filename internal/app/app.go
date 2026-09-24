package app

import (
	"context"
	"log"
	"sync"
	"time"

	hostgrpc "github.com/galacius/galacius/internal/api/grpc"
	"github.com/galacius/galacius/internal/config"
	"github.com/galacius/galacius/internal/kube"
	"github.com/galacius/galacius/internal/lib/debouncer"
	"github.com/galacius/galacius/internal/plugin"
	"github.com/galacius/galacius/internal/proxy"
	"github.com/galacius/galacius/internal/updater"
	"github.com/galacius/galacius/packages/core/kube/dto"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/remotecommand"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
)

// metricsFetchTimeout bounds queries to metrics-server (cluster-local call on desktop-app IPC path).
// Long enough to tolerate normal latency; short enough to keep the UI responsive when metrics-server
// is unavailable or slow.
const metricsFetchTimeout = 3 * time.Second

// apiReadTimeout bounds direct clientset Get/List calls that bypass the informer cache
// (e.g. Get*YAML methods). These hit the live API server rather than a local cache.
const apiReadTimeout = 10 * time.Second

// apiMutationTimeout bounds Create/Update/Patch/Delete calls, which may wait on
// etcd persistence or admission webhooks and so get more headroom than reads.
const apiMutationTimeout = 30 * time.Second

// App struct
type App struct {
	ctx                   context.Context
	version               string
	appSizeBytes          int64         // cached at startup, read-only afterward
	installSource         string        // set once during Startup; guarded by mu
	installSourceReady    chan struct{} // closed once installSource has been detected; see GetInstallSource
	settings              config.Settings
	clients               map[string]*kubernetes.Clientset
	factories             map[string]*kube.FactoryHandle
	metricsClients        map[string]*metricsclient.Clientset
	activeContext         string
	activeContextSeq      int64    // guarded by mu; monotonic per Connect call, see Connect
	activeNamespaces      []string // guarded by mu; empty/nil = all namespaces
	activeNamespacesSeq   int64    // guarded by mu; see SetActiveNamespaces
	mu                    sync.RWMutex
	lastUpdateCheckResult *UpdateCheckResult // guarded by mu; caches the last successful update check
	portForwards          map[string]dto.PortForward
	pfMu                  sync.RWMutex
	restConfigs           map[string]*rest.Config
	pfCancels             map[string]context.CancelFunc
	logCancels            map[string]context.CancelFunc
	logSeqs               map[string]uint64
	execCancels           map[string]context.CancelFunc
	execResizeChans       map[string]chan remotecommand.TerminalSize
	streamMu              sync.Mutex
	pluginLoaders         map[string]*plugin.PluginLoader
	removingPluginIDs     map[string]bool // tracks plugins being removed to prevent concurrent installs
	// pluginsMu guards pluginLoaders and removingPluginIDs. Lock ordering: never
	// hold pluginsMu while acquiring mu (mu may be taken first and released, then
	// pluginsMu taken separately, but not nested) — mu-guarded helpers like
	// pluginsRootDir() are called from within pluginsMu critical sections
	// (e.g. InstallPlugin), so acquiring mu while already holding pluginsMu is
	// fine, but the reverse (acquiring pluginsMu while already holding mu) would
	// risk lock-order inversion and must be avoided.
	pluginsMu       sync.RWMutex
	grpcServerCfg   *hostgrpc.GRPCServerConfig
	proxyManagers   map[string]*proxy.Manager
	proxyManagersMu sync.RWMutex

	// watchedSecret/watchedResourceQuota/watchedPersistentVolumeClaim/... track
	// the resource currently shown in that kind's (single) open detail drawer,
	// if any — see detailWatch and the WatchXxxDetail/UnwatchXxxDetail/
	// emitXxxDetail trio in secret.go/resourcequota.go/pvc.go/etc. For
	// cluster-scoped kinds (PersistentVolume, ValidatingWebhookConfig) the
	// namespace half of the key is always "".
	watchedPod                     detailWatch
	watchedSecret                  detailWatch
	watchedResourceQuota           detailWatch
	watchedPersistentVolumeClaim   detailWatch
	watchedHPA                     detailWatch
	watchedLimitRange              detailWatch
	watchedNetworkPolicy           detailWatch
	watchedPodDisruptionBudget     detailWatch
	watchedIngress                 detailWatch
	watchedPersistentVolume        detailWatch
	watchedValidatingWebhookConfig detailWatch
	watchedClusterRoleBinding      detailWatch
	watchedClusterRole             detailWatch
	watchedRoleBinding             detailWatch
	watchedRole                    detailWatch
	watchedServiceAccount          detailWatch
	watchedEvent                   detailWatch
	watchedNamespace               detailWatch
	watchedNode                    detailWatch
	watchedConfigMap               detailWatch
	watchedEndpoint                detailWatch
	watchedIngressClass            detailWatch
	watchedService                 detailWatch
	watchedCronJob                 detailWatch
	watchedDaemonSet               detailWatch
	watchedDeployment              detailWatch
	watchedJob                     detailWatch
	watchedReplicaSet              detailWatch
	watchedStatefulSet             detailWatch
}

// NewApp creates a new App application struct
func NewApp(version string) *App {
	s, _ := config.Load()
	// resolveLoginShellPATH shells out to the user's login shell (up to a 5s
	// timeout on macOS) and NewApp runs before wails.Run even starts, so doing
	// this synchronously blocks the whole process before a window can appear.
	// It's best-effort — Setenv is skipped on failure/timeout and the app keeps
	// the original PATH — and only affects exec-credential-plugin lookups
	// (aws/gcloud) during a later Connect(), which needs user interaction and
	// so has ample time for this to finish first.
	// Skipped in tests ("test" is the sentinel version every unit test passes
	// to NewApp) — otherwise every test constructing an App piles up real
	// subprocess spawns with no benefit, which is slow and flaky under load.
	if version != "test" {
		go resolveLoginShellPATH(s.ShellPath)
	}
	return &App{
		version:            version,
		settings:           s,
		clients:            make(map[string]*kubernetes.Clientset),
		factories:          make(map[string]*kube.FactoryHandle),
		metricsClients:     make(map[string]*metricsclient.Clientset),
		portForwards:       make(map[string]dto.PortForward),
		restConfigs:        make(map[string]*rest.Config),
		pfCancels:          make(map[string]context.CancelFunc),
		logCancels:         make(map[string]context.CancelFunc),
		logSeqs:            make(map[string]uint64),
		execCancels:        make(map[string]context.CancelFunc),
		execResizeChans:    make(map[string]chan remotecommand.TerminalSize),
		pluginLoaders:      make(map[string]*plugin.PluginLoader),
		removingPluginIDs:  make(map[string]bool),
		proxyManagers:      make(map[string]*proxy.Manager),
		installSourceReady: make(chan struct{}),
	}
}

// Startup is called when the app starts. The context is saved
// so we can call the runtime methods.
// Wails guarantees Startup completes before DomReady/frontend JS runs, so
// restoreInstalledPlugins must stay synchronous here — moving it into a
// goroutine would let an early GetInstalledPlugin poll race ahead of it and
// see NOT_INSTALLED for an already-installed plugin.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.appSizeBytes = getAppSizeBytes()
	a.detectInstallSource()
	a.restoreInstalledPlugins()
	a.runServer()
	go a.checkForUpdate(3)

	// Launch every installed plugin's subprocess now, independent of any cluster
	// connection: plugins can contribute app-wide UI (e.g. a Settings tab) that
	// must work before the user ever selects a cluster. Runs in the background
	// since spawning + handshaking a subprocess is too slow to block Startup.
	go a.launchInstalledPlugins()
}

// runServer starts the plugin cluster context gRPC server. This is required
// for cluster sync to work with plugins; if it fails, plugins will not
// receive context changes.
func (a *App) runServer() {
	eventEmitter := func(payload map[string]any) {
		wailsruntime.EventsEmit(a.ctx, "plugin:event", payload)
	}
	grpcCfg, err := hostgrpc.NewGRPCServerConfig(eventEmitter)
	if err != nil {
		// Log with ERROR level since plugin sync is essential infrastructure
		log.Printf("ERROR: failed to start plugin gRPC server: %v (plugins will not receive cluster context changes)", err)
	} else {
		a.grpcServerCfg = grpcCfg
		log.Printf("plugin cluster context gRPC server started on port %d", grpcCfg.Port())
	}
}

// detectInstallSource blocks up to ~2s (brew's timeout), but eliminates the
// race entirely and completes before frontend JS runs.
func (a *App) detectInstallSource() {
	source := updater.DetectInstallSource()
	a.mu.Lock()
	a.installSource = source
	a.mu.Unlock()
	close(a.installSourceReady)
}

// DomReady is called once the frontend DOM is loaded and the native window is visible.
func (a *App) DomReady(_ context.Context) {
	enableFullscreenButton()
}

// Shutdown is called by Wails when the app is quitting (menu Quit, window
// close, ⌘Q). It gracefully terminates every running plugin subprocess so
// they don't leak as orphaned processes — without this, a plugin process
// keeps running (and its lock file keeps pointing at a live PID) after the
// app exits, which a future session can then mistakenly reuse via
// PluginLoader.Launch()'s stale-lock reuse path, even after the plugins
// directory has since changed.
func (a *App) Shutdown(_ context.Context) {
	// Stop proxy managers first.
	a.stopAllProxyManagers()

	// Kill plugin processes before stopping the gRPC server. Each plugin
	// holds a long-lived ClusterContextWatch stream open for its entire
	// lifetime (see internal/api/grpc/server.go), and grpcServerCfg.Stop() calls
	// GracefulStop(), which blocks until every active RPC finishes. Stopping
	// the server first would deadlock: GracefulStop waits on a stream that
	// only closes when the plugin dies, but the plugin is only killed below.
	a.pluginsMu.Lock()
	for id, loader := range a.pluginLoaders {
		if err := loader.Shutdown(); err != nil {
			log.Printf("plugin %q shutdown on app quit failed: %v", id, err)
		}
	}
	a.pluginsMu.Unlock()

	if a.grpcServerCfg != nil {
		a.grpcServerCfg.Stop()
	}
}

// GetVersion returns the current application version.
func (a *App) GetVersion() string {
	return a.version
}

func (a *App) emitConnectStatus(contextName, message string) {
	wailsruntime.EventsEmit(a.ctx, "connect:status", map[string]string{
		"context": contextName,
		"message": message,
	})
}

// handleProxyLost tears down the cached clientset/informer factory for
// contextName when its setup-command proxy dies mid-session (e.g. a tunnel
// that doesn't survive the machine sleeping for a long time) and tells the
// frontend the session needs to reconnect.
//
// Without this, Connect() had already returned successfully long ago and the
// frontend has moved on to showing the normal cluster UI (MainLayout), which
// has no listener for the proxy manager's Degraded/Crashed events — only the
// initial "connecting" screen does, and it's unmounted by then. Every
// resource view was left silently wired to informers that can never sync
// again against the now-dead local proxy port, with nothing but a passive
// footer dot to hint anything was wrong and no way to trigger a reconnect
// short of quitting the app. Clearing activeContext here, in addition to
// stopping the stale factory, also makes a subsequent Connect() to this same
// context rebuild its clientset from scratch instead of reusing one whose
// underlying transport was dialed through the dead proxy.
func (a *App) handleProxyLost(contextName, message string) {
	a.mu.Lock()
	if a.activeContext != contextName {
		// Already disconnected/switched away by the time this fired; nothing to tear down.
		a.mu.Unlock()
		return
	}
	factory := a.factories[contextName]
	delete(a.factories, contextName)
	delete(a.clients, contextName)
	delete(a.restConfigs, contextName)
	delete(a.metricsClients, contextName)
	a.activeContext = ""
	a.mu.Unlock()

	if factory != nil {
		factory.Stop()
	}

	log.Printf("app: proxy for %q lost mid-session, connection torn down: %s", contextName, message)
	wailsruntime.EventsEmit(a.ctx, "cluster:connectionLost", map[string]string{
		"context": contextName,
		"message": message,
	})
}

// Connect builds (or reuses) a clientset for the given context, probes the API
// server, and marks the context active. The ping runs outside the lock so a
// slow or unreachable cluster never blocks other goroutines reading the cache.
// NewFactoryHandle returns immediately; each resource's cache is warmed
// asynchronously. Callers must wait on GetSyncedChan(resource) or the
// waitForResourceSync* helpers before reading a lister.
//
// seq is a value the frontend increments synchronously on every call (before
// the async IPC dispatch), same pattern as SetActiveNamespaces: rapid
// back-and-forth context switches launch multiple Connect calls concurrently,
// and since each does slow network/informer-sync work outside any lock that
// serializes it against the others, they can complete in an order that
// doesn't match the order the user clicked them in. Without seq, whichever
// call happens to finish last wins and silently overwrites activeContext with
// a stale (no-longer-selected) context — every List*/Get* call and the
// namespace filter would then silently keep operating on the wrong cluster
// while the UI shows the one the user actually selected.
func (a *App) Connect(contextName string, seq int64) error {
	if !a.tryClaimConnectSeq(seq) {
		return nil
	}

	// Clear every plugin's cached activeContext/activeNamespaces before doing any
	// of the slow work below — see clearPluginClusterState for why this has to be
	// the first step, not an afterthought.
	a.clearPluginClusterState()

	a.emitConnectStatus(contextName, "Loading cluster configuration...")

	a.mu.RLock()
	cs, exists := a.clients[contextName]
	proxyCfg := a.settings.ClusterProxies[contextName]
	httpProxy := proxyCfg.HttpProxy
	httpsProxy := proxyCfg.HttpsProxy
	setupCommand := proxyCfg.SetupCommand
	proxySetupEnabled := a.settings.ProxySetupEnabled
	healthCheckIntervalSeconds := a.settings.ProxyHealthCheckIntervalSeconds
	kubeconfigPaths := a.settings.KubeconfigPaths
	previousContext := a.activeContext
	a.mu.RUnlock()

	// Tear down the outgoing context's proxy manager as soon as a switch
	// begins, not after the new context's own setup command finishes
	// waiting. Deferring this left the previous manager sitting in Ready for
	// as long as the new context's setup command took (e.g. its own SSO
	// flow) — switching back to it during that window reused the still-Ready
	// manager and skipped waiting for a fresh setup entirely, i.e. the old
	// session was never actually cleaned up.
	if previousContext != "" && previousContext != contextName {
		a.stopProxyManager(previousContext)
	}

	if setupCommand != "" && proxySetupEnabled {
		a.emitConnectStatus(contextName, "Starting proxy server")
		mgr := a.ensureProxyManager(contextName, setupCommand, httpProxy, httpsProxy, healthCheckIntervalSeconds)
		mgr.Connect()
		a.emitConnectStatus(contextName, "Connecting to proxy server...")
		<-mgr.Wait() // pauses here through e.g. an SSO browser flow the command opens, until ready/timeout/failure
	}

	var rc *rest.Config
	if !exists {
		a.emitConnectStatus(contextName, "Building API client...")
		var err error
		cs, rc, err = kube.NewClientset(contextName, httpProxy, httpsProxy, kubeconfigPaths)
		if err != nil {
			a.emitConnectStatus(contextName, "Failed to build API client: "+err.Error())
			return err
		}
		a.emitConnectStatus(contextName, "API client ready")
	}

	// Always verify the API server is reachable before marking connected.
	a.emitConnectStatus(contextName, "Verifying API server connectivity...")
	pingCtx, cancelPing := context.WithTimeout(context.Background(), 30*time.Second)
	err := kube.Ping(pingCtx, cs)
	cancelPing()
	if err != nil {
		a.emitConnectStatus(contextName, "Cannot reach API server: "+err.Error())
		return err
	}
	a.emitConnectStatus(contextName, "API server reachable")

	a.mu.Lock()
	if _, recheck := a.clients[contextName]; !recheck {
		a.clients[contextName] = cs
	}
	if rc != nil {
		a.restConfigs[contextName] = rc
	}

	// Stop any existing factory for this context before creating a new one.
	if old, ok := a.factories[contextName]; ok {
		old.Stop()
	}

	a.emitConnectStatus(contextName, "Starting informers...")
	var forbiddenOnce sync.Map
	h := kube.NewFactoryHandle(cs, func(resource, namespace string) {
		key := resource + "\x00" + namespace
		if _, loaded := forbiddenOnce.LoadOrStore(key, true); !loaded {
			wailsruntime.EventsEmit(a.ctx, "resource:forbidden", map[string]string{
				"resource":  resource,
				"namespace": namespace,
			})
		}
	})

	// A newer Connect call may have already become active while this one was
	// blocked building its client and syncing informers above — don't let a
	// stale call clobber it. Stop the just-synced factory rather than leaking it.
	if seq < a.activeContextSeq {
		a.mu.Unlock()
		h.Stop()
		return nil
	}
	a.factories[contextName] = h
	a.activeContext = contextName
	// Restore this context's persisted default namespace filter (rather than
	// resetting to nil/"all namespaces") and push it to plugins unconditionally
	// on every Connect — not just on a genuine context switch. A plain
	// reconnect to the already-active context (e.g. a page reload while the
	// host process keeps running) previously fell into the "no context
	// change, no push" branch, leaving a running plugin's synced namespace
	// filter stale (e.g. left over from an earlier in-session selection) with
	// nothing to correct it: the frontend's MainLayout does asynchronously
	// re-push its restored defaults on mount, but any plugin business call
	// racing ahead of that IPC round trip would be served — and its result
	// cached indefinitely — against the stale filter. Pushing the correct
	// restored value here, synchronously within Connect() and before it
	// returns to the frontend, closes that window instead of relying on the
	// slower async re-push to win the race.
	restoredNamespaces := a.restoredNamespacesForContextLocked(contextName)
	a.activeNamespaces = restoredNamespaces
	// Reset the SetActiveNamespaces staleness counter too. It's compared
	// against the frontend's own in-memory call counter (see
	// useSetActiveNamespaces.tsx), which restarts from zero on every page
	// load/reload — including the "page reload while the host process keeps
	// running" case this whole block exists for. Without this reset, the
	// frontend's post-mount re-push of restoredNamespaces above (and every
	// namespace-filter change after it) would carry a seq the long-lived
	// backend process already considers stale, and get silently dropped by
	// SetActiveNamespaces's seq <= a.activeNamespacesSeq guard — leaving the
	// namespace selector UI and the actual resource lists permanently out of
	// sync until the app restarts.
	a.activeNamespacesSeq = 0

	// Push cluster context to all running plugins with HTTP backends.
	// Phase 2 design decision: "The host pushes POST on every cluster switch."
	// Unlock before resolving the kubeconfig path and pushing: GetContextKubeconfigPath
	// takes its own RLock on a.mu, and a.mu is not reentrant, so calling it while still
	// holding the write lock acquired above would deadlock.
	a.mu.Unlock()
	a.emitActiveContextToPlugins(contextName)
	a.emitActiveNamespacesToPlugins(restoredNamespaces)
	a.mu.Lock()

	// Register event handlers for live updates.
	isCtx := func() bool { return a.isActive(contextName) }
	debLeases := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitLeases() }, isCtx)
	debEvents := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitEvents() }, isCtx)
	debEventDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitEventDetail() }, isCtx)
	debEndpoints := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitEndpoints() }, isCtx)
	debEndpointDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitEndpointDetail() }, isCtx)
	debEndpointSlices := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitEndpointSlices() }, isCtx)
	debPods := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitPods() }, isCtx)
	debPodDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitPodDetail() }, isCtx)
	// Scope the Pods informer(s) to the namespace filter already known at
	// connect time (restoredNamespaces), avoiding a cluster-wide Pods LIST
	// when the caller only cares about a handful of namespaces. See
	// FactoryHandle.RescopePods.
	h.SetPodsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debPods.Trigger(ns)
			debPodDetail.Trigger(ns)
		}
	})
	h.RescopePods(restoredNamespaces)
	debDeployments := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitDeployments() }, isCtx)
	debDeploymentDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitDeploymentDetail() }, isCtx)
	// Scope the Deployments/DaemonSets/StatefulSets/ReplicaSets/Jobs/CronJobs
	// informer(s) to the namespace filter already known at connect time
	// (restoredNamespaces), avoiding a cluster-wide LIST when the caller
	// only cares about a handful of namespaces. See FactoryHandle.RescopePods
	// for the pattern this mirrors.
	h.SetDeploymentsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debDeployments.Trigger(ns)
			debDeploymentDetail.Trigger(ns)
		}
	})
	h.RescopeDeployments(restoredNamespaces)
	debDaemonSets := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitDaemonSets() }, isCtx)
	debDaemonSetDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitDaemonSetDetail() }, isCtx)
	h.SetDaemonSetsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debDaemonSets.Trigger(ns)
			debDaemonSetDetail.Trigger(ns)
		}
	})
	h.RescopeDaemonSets(restoredNamespaces)
	debReplicaSets := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitReplicaSets() }, isCtx)
	debReplicaSetDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitReplicaSetDetail() }, isCtx)
	h.SetReplicaSetsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debReplicaSets.Trigger(ns)
			debReplicaSetDetail.Trigger(ns)
		}
	})
	h.RescopeReplicaSets(restoredNamespaces)
	debStatefulSets := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitStatefulSets() }, isCtx)
	debStatefulSetDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitStatefulSetDetail() }, isCtx)
	h.SetStatefulSetsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debStatefulSets.Trigger(ns)
			debStatefulSetDetail.Trigger(ns)
		}
	})
	h.RescopeStatefulSets(restoredNamespaces)
	debJobs := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitJobs() }, isCtx)
	debJobDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitJobDetail() }, isCtx)
	h.SetJobsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debJobs.Trigger(ns)
			debJobDetail.Trigger(ns)
		}
	})
	h.RescopeJobs(restoredNamespaces)
	debCronJobs := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitCronJobs() }, isCtx)
	debCronJobDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitCronJobDetail() }, isCtx)
	h.SetCronJobsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debCronJobs.Trigger(ns)
			debCronJobDetail.Trigger(ns)
		}
	})
	h.RescopeCronJobs(restoredNamespaces)
	debConfigMaps := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitConfigMaps() }, isCtx)
	debConfigMapDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitConfigMapDetail() }, isCtx)
	debSecrets := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitSecrets() }, isCtx)
	debSecretDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitSecretDetail() }, isCtx)
	debResourceQuotas := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitResourceQuotas() }, isCtx)
	debResourceQuotaDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitResourceQuotaDetail() }, isCtx)
	debLimitRanges := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitLimitRanges() }, isCtx)
	debLimitRangeDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitLimitRangeDetail() }, isCtx)
	debHPAs := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitHPAs() }, isCtx)
	debHPADetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitHPADetail() }, isCtx)
	debPodDisruptionBudgets := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitPodDisruptionBudgets() }, isCtx)
	debPodDisruptionBudgetDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitPodDisruptionBudgetDetail() }, isCtx)
	debIngresses := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitIngresses() }, isCtx)
	debIngressDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitIngressDetail() }, isCtx)
	debNetworkPolicies := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitNetworkPolicies() }, isCtx)
	debNetworkPolicyDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitNetworkPolicyDetail() }, isCtx)
	debIngressClasses := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitIngressClasses() }, isCtx)
	debIngressClassDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitIngressClassDetail() }, isCtx)
	debValidatingWebhookConfigs := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitValidatingWebhookConfigs() }, isCtx)
	debValidatingWebhookConfigDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitValidatingWebhookConfigDetail() }, isCtx)
	debPersistentVolumeClaims := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitPersistentVolumeClaims() }, isCtx)
	debPersistentVolumeClaimDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitPersistentVolumeClaimDetail() }, isCtx)
	debPersistentVolumes := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitPersistentVolumes() }, isCtx)
	debPersistentVolumeDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitPersistentVolumeDetail() }, isCtx)
	debStorageClasses := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitStorageClasses() }, isCtx)
	debServices := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitServices() }, isCtx)
	debServiceDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitServiceDetail() }, isCtx)
	debNodes := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitNodes() }, isCtx)
	debNodeDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitNodeDetail() }, isCtx)
	debNamespaces := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitNamespaces() }, isCtx)
	debNamespaceDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitNamespaceDetail() }, isCtx)
	debServiceAccounts := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitServiceAccounts() }, isCtx)
	debServiceAccountDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitServiceAccountDetail() }, isCtx)
	debClusterRoles := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitClusterRoles() }, isCtx)
	debClusterRoleDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitClusterRoleDetail() }, isCtx)
	debRoles := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitRoles() }, isCtx)
	debRoleDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitRoleDetail() }, isCtx)
	debClusterRoleBindings := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitClusterRoleBindings() }, isCtx)
	debClusterRoleBindingDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitClusterRoleBindingDetail() }, isCtx)
	debRoleBindings := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitRoleBindings() }, isCtx)
	debRoleBindingDetail := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitRoleBindingDetail() }, isCtx)
	debPriorityClasses := debouncer.NewDebouncer(debouncer.DefaultDebounceInterval, func(_ string) { a.emitPriorityClasses() }, isCtx)

	// Register all debouncers with the factory for lifecycle management
	h.RegisterDebouncer(debLeases)
	h.RegisterDebouncer(debEvents)
	h.RegisterDebouncer(debEventDetail)
	h.RegisterDebouncer(debEndpoints)
	h.RegisterDebouncer(debEndpointDetail)
	h.RegisterDebouncer(debEndpointSlices)
	h.RegisterDebouncer(debPods)
	h.RegisterDebouncer(debPodDetail)
	h.RegisterDebouncer(debDeployments)
	h.RegisterDebouncer(debDeploymentDetail)
	h.RegisterDebouncer(debDaemonSets)
	h.RegisterDebouncer(debDaemonSetDetail)
	h.RegisterDebouncer(debReplicaSets)
	h.RegisterDebouncer(debReplicaSetDetail)
	h.RegisterDebouncer(debStatefulSets)
	h.RegisterDebouncer(debStatefulSetDetail)
	h.RegisterDebouncer(debJobs)
	h.RegisterDebouncer(debJobDetail)
	h.RegisterDebouncer(debCronJobs)
	h.RegisterDebouncer(debCronJobDetail)
	h.RegisterDebouncer(debConfigMaps)
	h.RegisterDebouncer(debConfigMapDetail)
	h.RegisterDebouncer(debSecrets)
	h.RegisterDebouncer(debSecretDetail)
	h.RegisterDebouncer(debResourceQuotas)
	h.RegisterDebouncer(debResourceQuotaDetail)
	h.RegisterDebouncer(debLimitRanges)
	h.RegisterDebouncer(debLimitRangeDetail)
	h.RegisterDebouncer(debHPAs)
	h.RegisterDebouncer(debHPADetail)
	h.RegisterDebouncer(debPodDisruptionBudgets)
	h.RegisterDebouncer(debPodDisruptionBudgetDetail)
	h.RegisterDebouncer(debIngresses)
	h.RegisterDebouncer(debIngressDetail)
	h.RegisterDebouncer(debNetworkPolicies)
	h.RegisterDebouncer(debNetworkPolicyDetail)
	h.RegisterDebouncer(debIngressClasses)
	h.RegisterDebouncer(debIngressClassDetail)
	h.RegisterDebouncer(debValidatingWebhookConfigs)
	h.RegisterDebouncer(debValidatingWebhookConfigDetail)
	h.RegisterDebouncer(debPersistentVolumeClaims)
	h.RegisterDebouncer(debPersistentVolumeClaimDetail)
	h.RegisterDebouncer(debPersistentVolumes)
	h.RegisterDebouncer(debPersistentVolumeDetail)
	h.RegisterDebouncer(debStorageClasses)
	h.RegisterDebouncer(debServices)
	h.RegisterDebouncer(debServiceDetail)
	h.RegisterDebouncer(debNodes)
	h.RegisterDebouncer(debNodeDetail)
	h.RegisterDebouncer(debNamespaces)
	h.RegisterDebouncer(debNamespaceDetail)
	h.RegisterDebouncer(debServiceAccounts)
	h.RegisterDebouncer(debServiceAccountDetail)
	h.RegisterDebouncer(debClusterRoles)
	h.RegisterDebouncer(debClusterRoleDetail)
	h.RegisterDebouncer(debRoles)
	h.RegisterDebouncer(debRoleDetail)
	h.RegisterDebouncer(debClusterRoleBindings)
	h.RegisterDebouncer(debClusterRoleBindingDetail)
	h.RegisterDebouncer(debRoleBindings)
	h.RegisterDebouncer(debRoleBindingDetail)
	h.RegisterDebouncer(debPriorityClasses)

	// ConfigMaps/Secrets/ResourceQuotas/LimitRanges/HPAs/PDBs/Leases/Services/
	// EndpointSlices/Endpoints/Ingresses/NetworkPolicies/PVCs/ServiceAccounts/
	// Roles/RoleBindings/Events no longer get a raw AddEventHandler block
	// here: SetXEventHandler below wires their debouncer into the
	// nsscope-managed informer(s), which survive RescopeXxx rebuilds (a plain
	// AddEventHandler on h.Factory.Xxx().Informer() would not) — same
	// pattern as Deployments/DaemonSets/ReplicaSets/StatefulSets/Jobs/CronJobs
	// above.
	h.SetConfigMapsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debConfigMaps.Trigger(ns)
			debConfigMapDetail.Trigger(ns)
		}
	})
	h.RescopeConfigMaps(restoredNamespaces)
	h.SetSecretsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debSecrets.Trigger(ns)
			debSecretDetail.Trigger(ns)
		}
	})
	h.RescopeSecrets(restoredNamespaces)
	h.SetResourceQuotasEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debResourceQuotas.Trigger(ns)
			debResourceQuotaDetail.Trigger(ns)
		}
	})
	h.RescopeResourceQuotas(restoredNamespaces)
	h.SetLimitRangesEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debLimitRanges.Trigger(ns)
			debLimitRangeDetail.Trigger(ns)
		}
	})
	h.RescopeLimitRanges(restoredNamespaces)
	h.SetHorizontalPodAutoscalersEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debHPAs.Trigger(ns)
			debHPADetail.Trigger(ns)
		}
	})
	h.RescopeHorizontalPodAutoscalers(restoredNamespaces)
	h.SetPodDisruptionBudgetsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debPodDisruptionBudgets.Trigger(ns)
			debPodDisruptionBudgetDetail.Trigger(ns)
		}
	})
	h.RescopePodDisruptionBudgets(restoredNamespaces)
	h.SetIngressesEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debIngresses.Trigger(ns)
			debIngressDetail.Trigger(ns)
		}
	})
	h.RescopeIngresses(restoredNamespaces)
	h.SetNetworkPoliciesEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debNetworkPolicies.Trigger(ns)
			debNetworkPolicyDetail.Trigger(ns)
		}
	})
	h.RescopeNetworkPolicies(restoredNamespaces)
	h.Factory.Networking().V1().IngressClasses().Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj any) {
			if a.isActive(contextName) {
				debIngressClasses.Trigger("")
				debIngressClassDetail.Trigger("")
			}
		},
		UpdateFunc: func(old, new any) {
			if a.isActive(contextName) {
				debIngressClasses.Trigger("")
				debIngressClassDetail.Trigger("")
			}
		},
		DeleteFunc: func(obj any) {
			if a.isActive(contextName) {
				debIngressClasses.Trigger("")
				debIngressClassDetail.Trigger("")
			}
		},
	})
	h.Factory.Admissionregistration().V1().ValidatingWebhookConfigurations().Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj any) {
			if a.isActive(contextName) {
				debValidatingWebhookConfigs.Trigger("")
				debValidatingWebhookConfigDetail.Trigger("")
			}
		},
		UpdateFunc: func(old, new any) {
			if a.isActive(contextName) {
				debValidatingWebhookConfigs.Trigger("")
				debValidatingWebhookConfigDetail.Trigger("")
			}
		},
		DeleteFunc: func(obj any) {
			if a.isActive(contextName) {
				debValidatingWebhookConfigs.Trigger("")
				debValidatingWebhookConfigDetail.Trigger("")
			}
		},
	})
	h.SetPersistentVolumeClaimsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debPersistentVolumeClaims.Trigger(ns)
			debPersistentVolumeClaimDetail.Trigger(ns)
		}
	})
	h.RescopePersistentVolumeClaims(restoredNamespaces)
	h.Factory.Core().V1().PersistentVolumes().Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj any) {
			if a.isActive(contextName) {
				debPersistentVolumes.Trigger("")
				debPersistentVolumeDetail.Trigger("")
			}
		},
		UpdateFunc: func(old, new any) {
			if a.isActive(contextName) {
				debPersistentVolumes.Trigger("")
				debPersistentVolumeDetail.Trigger("")
			}
		},
		DeleteFunc: func(obj any) {
			if a.isActive(contextName) {
				debPersistentVolumes.Trigger("")
				debPersistentVolumeDetail.Trigger("")
			}
		},
	})
	h.Factory.Storage().V1().StorageClasses().Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj any) {
			if a.isActive(contextName) {
				debStorageClasses.Trigger("")
			}
		},
		UpdateFunc: func(old, new any) {
			if a.isActive(contextName) {
				debStorageClasses.Trigger("")
			}
		},
		DeleteFunc: func(obj any) {
			if a.isActive(contextName) {
				debStorageClasses.Trigger("")
			}
		},
	})
	h.SetEndpointsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debEndpoints.Trigger(ns)
			debEndpointDetail.Trigger(ns)
		}
	})
	h.RescopeEndpoints(restoredNamespaces)
	h.SetServicesEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debServices.Trigger(ns)
			debServiceDetail.Trigger(ns)
		}
	})
	h.RescopeServices(restoredNamespaces)
	h.Factory.Core().V1().Nodes().Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj any) {
			if a.isActive(contextName) {
				debNodes.Trigger("")
				debNodeDetail.Trigger("")
			}
		},
		UpdateFunc: func(old, new any) {
			if a.isActive(contextName) {
				debNodes.Trigger("")
				debNodeDetail.Trigger("")
			}
		},
		DeleteFunc: func(obj any) {
			if a.isActive(contextName) {
				debNodes.Trigger("")
				debNodeDetail.Trigger("")
			}
		},
	})
	h.Factory.Core().V1().Namespaces().Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj any) {
			if a.isActive(contextName) {
				debNamespaces.Trigger("")
				debNamespaceDetail.Trigger("")
			}
		},
		UpdateFunc: func(old, new any) {
			if a.isActive(contextName) {
				debNamespaces.Trigger("")
				debNamespaceDetail.Trigger("")
			}
		},
		DeleteFunc: func(obj any) {
			if a.isActive(contextName) {
				debNamespaces.Trigger("")
				debNamespaceDetail.Trigger("")
			}
		},
	})
	h.SetServiceAccountsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debServiceAccounts.Trigger(ns)
			debServiceAccountDetail.Trigger(ns)
		}
	})
	h.RescopeServiceAccounts(restoredNamespaces)
	h.Factory.Rbac().V1().ClusterRoles().Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj any) {
			if a.isActive(contextName) {
				debClusterRoles.Trigger("")
				debClusterRoleDetail.Trigger("")
			}
		},
		UpdateFunc: func(old, new any) {
			if a.isActive(contextName) {
				debClusterRoles.Trigger("")
				debClusterRoleDetail.Trigger("")
			}
		},
		DeleteFunc: func(obj any) {
			if a.isActive(contextName) {
				debClusterRoles.Trigger("")
				debClusterRoleDetail.Trigger("")
			}
		},
	})
	h.SetRolesEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debRoles.Trigger(ns)
			debRoleDetail.Trigger(ns)
		}
	})
	h.RescopeRoles(restoredNamespaces)
	h.Factory.Rbac().V1().ClusterRoleBindings().Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj any) {
			if a.isActive(contextName) {
				debClusterRoleBindings.Trigger("")
				debClusterRoleBindingDetail.Trigger("")
			}
		},
		UpdateFunc: func(old, new any) {
			if a.isActive(contextName) {
				debClusterRoleBindings.Trigger("")
				debClusterRoleBindingDetail.Trigger("")
			}
		},
		DeleteFunc: func(obj any) {
			if a.isActive(contextName) {
				debClusterRoleBindings.Trigger("")
				debClusterRoleBindingDetail.Trigger("")
			}
		},
	})
	h.SetRoleBindingsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debRoleBindings.Trigger(ns)
			debRoleBindingDetail.Trigger(ns)
		}
	})
	h.RescopeRoleBindings(restoredNamespaces)
	h.Factory.Scheduling().V1().PriorityClasses().Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj any) {
			if a.isActive(contextName) {
				debPriorityClasses.Trigger("")
			}
		},
		UpdateFunc: func(old, new any) {
			if a.isActive(contextName) {
				debPriorityClasses.Trigger("")
			}
		},
		DeleteFunc: func(obj any) {
			if a.isActive(contextName) {
				debPriorityClasses.Trigger("")
			}
		},
	})
	h.SetLeasesEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debLeases.Trigger(ns)
		}
	})
	h.RescopeLeases(restoredNamespaces)
	h.SetEventsEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debEvents.Trigger(ns)
			debEventDetail.Trigger(ns)
		}
	})
	h.RescopeEvents(restoredNamespaces)
	h.SetEndpointSlicesEventHandler(func(ns string) {
		if a.isActive(contextName) {
			debEndpointSlices.Trigger(ns)
		}
	})
	h.RescopeEndpointSlices(restoredNamespaces)

	// Create (or replace) metrics client for this context.
	if mc, err := kube.NewMetricsClientForContext(contextName, httpProxy, httpsProxy, a.settings.KubeconfigPaths); err == nil {
		a.metricsClients[contextName] = mc
	}
	a.mu.Unlock()
	a.emitConnectStatus(contextName, "Connected")
	go a.prewarmRestoredPlugins(contextName)
	return nil
}

// IsResourceForbidden reports whether the given resource is known to be
// forbidden (403) in the currently active cluster context. Pass "" for
// namespace to ask "is this resource forbidden in any namespace" (dashboard/
// cluster-scoped callers); pass a specific namespace to ask "is this resource
// forbidden in this namespace specifically" (per-namespace detail drawers) —
// this distinction is what keeps a 403 in namespace B from being reported for
// a resource read in namespace A.
func (a *App) IsResourceForbidden(resource, namespace string) bool {
	a.mu.RLock()
	defer a.mu.RUnlock()
	h, ok := a.factories[a.activeContext]
	if !ok {
		return false
	}
	if namespace == "" {
		return h.IsForbidden(resource)
	}
	return h.IsNamespaceForbidden(resource, namespace)
}
