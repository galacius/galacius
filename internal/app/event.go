package app

import (
	"log"
	"sort"

	kubeResources "github.com/galacius/galacius/internal/kube/resources"
	"github.com/galacius/galacius/packages/core/kube/dto"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func sortEventsDesc(events []dto.Event) {
	sort.Slice(events, func(i, j int) bool {
		return events[i].CreatedAt > events[j].CreatedAt
	})
}

func warningEvents(events []dto.Event) []dto.Event {
	sortEventsDesc(events)
	result := make([]dto.Event, 0, len(events))
	for _, e := range events {
		if e.Type == "Warning" {
			result = append(result, e)
		}
	}
	return result
}

func (a *App) ListEvents() ([]dto.Event, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "events") {
		return []dto.Event{}, nil
	}
	result, err := kubeResources.ListEvents(
		h.EventLister(),
		namespaces,
	)
	if err != nil {
		log.Printf("app: ListEvents: %v", err)
		return []dto.Event{}, nil
	}
	return result, nil
}

func (a *App) ListWarningEvents() ([]dto.Event, error) {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "events") {
		return []dto.Event{}, nil
	}
	result, err := kubeResources.ListWarningEvents(
		h.EventLister(),
		namespaces,
	)
	if err != nil {
		log.Printf("app: ListWarningEvents: %v", err)
		return []dto.Event{}, nil
	}
	return result, nil
}

func (a *App) GetEventByName(namespace, name string) (dto.Event, error) {
	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "events") {
		return dto.Event{}, nil
	}
	result, err := kubeResources.GetEventByName(h.EventLister(), namespace, name)
	if err != nil {
		log.Printf("app: GetEventByName: %v", err)
		return dto.Event{}, nil
	}
	return result, nil
}

func (a *App) emitEvents() {
	h, namespaces := a.activeFactoryAndNamespaces()
	if !waitForResourceSyncIgnoringForbidden(h, "events") {
		return
	}
	lister := h.EventLister()
	data, err := kubeResources.ListEvents(lister, namespaces)
	if err != nil {
		log.Printf("app: emitEvents: %v", err)
		return
	}
	sortEventsDesc(data)
	runtime.EventsEmit(a.ctx, "events:update", data)
	runtime.EventsEmit(a.ctx, "events:warning:update", warningEvents(data))
}

// WatchEventDetail registers the frontend's interest in live "event:update"
// detail pushes for one specific Event (namespace/name) — the one currently
// shown in the (single) open Event detail drawer. Call UnwatchEventDetail
// on drawer close/unmount to stop.
func (a *App) WatchEventDetail(namespace, name string) {
	a.watchedEvent.watch(namespace, name)
}

// UnwatchEventDetail reverses WatchEventDetail.
func (a *App) UnwatchEventDetail(namespace, name string) {
	a.watchedEvent.unwatch(namespace, name)
}

// emitEventDetail pushes a fresh detail on "event:update" (singular — distinct from the
// "events:update" list topic) for the currently-watched Event, if any.
func (a *App) emitEventDetail() {
	namespace, name, ok := a.watchedEvent.get()
	if !ok {
		return
	}

	h := a.activeFactory()
	if !waitForResourceSyncIgnoringForbidden(h, "events") {
		return
	}
	detail, err := kubeResources.GetEventByName(h.EventLister(), namespace, name)
	if err != nil {
		return
	}
	runtime.EventsEmit(a.ctx, "event:update", detail)
}
