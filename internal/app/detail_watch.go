package app

import (
	"strings"
	"sync"
)

// detailWatch tracks the "namespace/name" key of a single resource currently
// being viewed in an open detail drawer. It backs the WatchXxxDetail /
// UnwatchXxxDetail / emitXxxDetail trio for resources whose Detail DTO has
// fields the list DTO doesn't (e.g. Secret.Data, ResourceQuota.Hard/Used,
// PersistentVolumeClaim.Finalizers/AccessModes) — those extra fields can't be
// merged locally from the list push, so an opt-in scoped "xxx:update" detail
// topic is used instead of an invalidate+refetch round trip. Only the
// resource actually being watched is ever pushed on that topic, so it's
// never broadcast to every list subscriber.
//
// A single key (not a refcounted set) is enough: only one detail drawer of a
// given kind is ever open at a time in this app.
type detailWatch struct {
	mu  sync.Mutex
	key string
}

func detailWatchKey(namespace, name string) string {
	return namespace + "/" + name
}

// splitDetailWatchKey reverses detailWatchKey. Kubernetes namespace/name
// values never contain "/", so a single split is unambiguous.
func splitDetailWatchKey(key string) (namespace, name string, ok bool) {
	namespace, name, found := strings.Cut(key, "/")
	return namespace, name, found
}

func (w *detailWatch) watch(namespace, name string) {
	w.mu.Lock()
	w.key = detailWatchKey(namespace, name)
	w.mu.Unlock()
}

// unwatch only clears the watch if it still matches (namespace, name), so an
// unwatch for a stale key (e.g. a slow-to-unmount previous drawer racing a
// newly opened one) can't clobber a newer watch.
func (w *detailWatch) unwatch(namespace, name string) {
	key := detailWatchKey(namespace, name)
	w.mu.Lock()
	if w.key == key {
		w.key = ""
	}
	w.mu.Unlock()
}

// get returns the currently-watched (namespace, name), or ok=false if none.
func (w *detailWatch) get() (namespace, name string, ok bool) {
	w.mu.Lock()
	key := w.key
	w.mu.Unlock()
	if key == "" {
		return "", "", false
	}
	return splitDetailWatchKey(key)
}
