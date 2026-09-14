package kubeResources

import (
	"log"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
)

func toEvent(e *corev1.Event) dto.Event {
	lastSeen := ""
	lastSeenAt := int64(0)
	if !e.LastTimestamp.IsZero() {
		lastSeen = humanAge(e.LastTimestamp.Time)
		lastSeenAt = e.LastTimestamp.Unix()
	}

	firstSeen := ""
	firstSeenAt := e.CreationTimestamp.Unix()
	if !e.FirstTimestamp.IsZero() {
		firstSeen = humanAge(e.FirstTimestamp.Time)
		firstSeenAt = e.FirstTimestamp.Unix()
	}

	managedFields := toManagedFields(e)

	return dto.Event{
		Type:               e.Type,
		Message:            e.Message,
		Namespace:          e.Namespace,
		InvolvedObjectKind: e.InvolvedObject.Kind,
		InvolvedObjectName: e.InvolvedObject.Name,
		Source:             e.Source.Component,
		Count:              e.Count,
		Age:                humanAge(e.CreationTimestamp.Time),
		LastSeen:           lastSeen,
		CreatedAt:          e.CreationTimestamp.Unix(),

		Name:                    e.Name,
		Reason:                  e.Reason,
		FirstSeen:               firstSeen,
		FirstSeenAt:             firstSeenAt,
		LastSeenAt:              lastSeenAt,
		InvolvedObjectFieldPath: e.InvolvedObject.FieldPath,
		InvolvedObjectNamespace: e.InvolvedObject.Namespace,
		ManagedFields:           managedFields,
	}
}

func GetEventByName(lister listerscorev1.EventLister, namespace, name string) (dto.Event, error) {
	e, err := lister.Events(namespace).Get(name)
	if err != nil {
		return dto.Event{}, err
	}
	return toEvent(e), nil
}

func ListEvents(lister listerscorev1.EventLister, namespaces []string) ([]dto.Event, error) {
	var events []*corev1.Event
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		events = all
	} else {
		for _, ns := range namespaces {
			nsEvents, err := lister.Events(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListEvents: namespace %q: %v", ns, err)
				continue
			}
			events = append(events, nsEvents...)
		}
	}
	result := make([]dto.Event, len(events))
	for i, e := range events {
		result[i] = toEvent(e)
	}
	return result, nil
}

func ListWarningEvents(lister listerscorev1.EventLister, namespaces []string) ([]dto.Event, error) {
	events, err := ListEvents(lister, namespaces)
	if err != nil {
		return nil, err
	}
	result := make([]dto.Event, 0, len(events))
	for _, e := range events {
		if e.Type == "Warning" {
			result = append(result, e)
		}
	}
	return result, nil
}
