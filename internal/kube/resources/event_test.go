package kubeResources

import (
	"errors"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	"k8s.io/client-go/tools/cache"
)

type errorEventLister struct{ err error }

func (e *errorEventLister) List(_ labels.Selector) ([]*corev1.Event, error) {
	return nil, e.err
}
func (e *errorEventLister) Events(_ string) listerscorev1.EventNamespaceLister {
	return &errorEventNamespaceLister{e.err}
}

type errorEventNamespaceLister struct{ err error }

func (e *errorEventNamespaceLister) List(_ labels.Selector) ([]*corev1.Event, error) {
	return nil, e.err
}
func (e *errorEventNamespaceLister) Get(_ string) (*corev1.Event, error) {
	return nil, e.err
}

func newEventLister(events ...*corev1.Event) listerscorev1.EventLister {
	indexer := cache.NewIndexer(cache.MetaNamespaceKeyFunc, cache.Indexers{cache.NamespaceIndex: cache.MetaNamespaceIndexFunc})
	for _, e := range events {
		_ = indexer.Add(e)
	}
	return listerscorev1.NewEventLister(indexer)
}

func makeEvent(name, namespace string, typeVal string) *corev1.Event {
	return &corev1.Event{
		ObjectMeta: metav1.ObjectMeta{
			Name:              name,
			Namespace:         namespace,
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Type: typeVal,
	}
}

func TestListEvents_SingleNamespace(t *testing.T) {
	ev := makeEvent("my-event", "production", corev1.EventTypeNormal)
	lister := newEventLister(ev)

	result, err := ListEvents(lister, []string{"production"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "my-event" {
		t.Errorf("Name = %q; want %q", result[0].Name, "my-event")
	}
}

func TestListEvents_EmptyNamespace_ReturnsEmpty(t *testing.T) {
	ev1 := makeEvent("ev-a", "ns-a", corev1.EventTypeNormal)
	ev2 := makeEvent("ev-b", "ns-b", corev1.EventTypeNormal)
	lister := newEventLister(ev1, ev2)

	result, err := ListEvents(lister, nil)
	if err != nil {
		t.Errorf("expected no error for nil namespaces; got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 items (cluster-wide list) for nil namespaces; got %d items", len(result))
	}
}

func TestListEvents_SpecificNamespaceFilters(t *testing.T) {
	ev1 := makeEvent("ev-a", "ns-a", corev1.EventTypeNormal)
	ev2 := makeEvent("ev-b", "ns-b", corev1.EventTypeNormal)
	lister := newEventLister(ev1, ev2)

	result, err := ListEvents(lister, []string{"ns-a"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].Name != "ev-a" {
		t.Errorf("Name = %q; want %q", result[0].Name, "ev-a")
	}
}

func TestListEvents_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newEventLister()

	result, err := ListEvents(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Error("expected non-nil slice; got nil")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result; got %d items", len(result))
	}
}

func TestListEvents_ErrorPropagation_ClusterScope(t *testing.T) {
	sentinel := errors.New("store unavailable")
	result, err := ListEvents(&errorEventLister{err: sentinel}, nil)
	if err == nil {
		t.Fatal("expected error for nil namespaces (cluster-wide list) to propagate")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result on cluster-wide list error; got %d items", len(result))
	}
}

func TestListEvents_ErrorPropagation_NamespacedScope(t *testing.T) {
	sentinel := errors.New("namespace store unavailable")
	result, err := ListEvents(&errorEventLister{err: sentinel}, []string{"default"})
	if err != nil {
		t.Errorf("expected no error (per-namespace errors are tolerated); got %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result (error on only namespace); got %d items", len(result))
	}
}

func TestListWarningEvents_FiltersWarnings(t *testing.T) {
	normal := makeEvent("normal-event", "default", corev1.EventTypeNormal)
	warning := makeEvent("warning-event", "default", corev1.EventTypeWarning)
	lister := newEventLister(normal, warning)

	result, err := ListWarningEvents(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 warning event, got %d", len(result))
	}
	if result[0].Name != "warning-event" {
		t.Errorf("Name = %q; want %q", result[0].Name, "warning-event")
	}
}

func TestListWarningEvents_EmptyLister_ReturnsEmptySlice(t *testing.T) {
	lister := newEventLister()

	result, err := ListWarningEvents(lister, []string{"default"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Error("expected non-nil slice; got nil")
	}
	if len(result) != 0 {
		t.Errorf("expected empty result; got %d items", len(result))
	}
}

func TestGetEventByName_Found(t *testing.T) {
	ev := makeEvent("my-event", "production", corev1.EventTypeNormal)
	lister := newEventLister(ev)

	result, err := GetEventByName(lister, "production", "my-event")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Name != "my-event" {
		t.Errorf("Name = %q; want %q", result.Name, "my-event")
	}
}

func TestGetEventByName_Age_NonZeroTimestamp(t *testing.T) {
	ev := makeEvent("my-event", "default", corev1.EventTypeNormal)
	lister := newEventLister(ev)

	result, err := GetEventByName(lister, "default", "my-event")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Age == "" {
		t.Error("Age should not be empty for a past CreationTimestamp")
	}
}

func TestToEvent_ZeroTimestamp_AgeIsNonEmpty(t *testing.T) {
	ev := &corev1.Event{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "event",
			Namespace: "default",
		},
		Type: corev1.EventTypeNormal,
	}
	got := toEvent(ev)
	if got.Age == "" {
		t.Error("Age must not be empty for zero-value CreationTimestamp")
	}
}

func TestToEvent_WarningType(t *testing.T) {
	ev := &corev1.Event{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "test-event",
			Namespace:         "default",
			CreationTimestamp: metav1.Time{Time: fixedTime},
		},
		Type: corev1.EventTypeWarning,
	}
	got := toEvent(ev)
	if got.Type != corev1.EventTypeWarning {
		t.Errorf("Type = %q; want %q", got.Type, corev1.EventTypeWarning)
	}
}
