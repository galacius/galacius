package kubeResources

import (
	"log"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	discoveryv1 "k8s.io/api/discovery/v1"
	"k8s.io/apimachinery/pkg/labels"
	discoveryv1listers "k8s.io/client-go/listers/discovery/v1"
)

func toEndpointSlice(es *discoveryv1.EndpointSlice) dto.EndpointSlice {
	endpoints := make([]dto.EndpointSliceEndpoint, 0, len(es.Endpoints))
	for _, ep := range es.Endpoints {
		targetName := ""
		targetKind := ""
		if ep.TargetRef != nil {
			targetName = ep.TargetRef.Name
			targetKind = ep.TargetRef.Kind
		}
		endpoints = append(endpoints, dto.EndpointSliceEndpoint{
			Addresses:   ep.Addresses,
			Hostname:    derefString(ep.Hostname),
			NodeName:    derefString(ep.NodeName),
			Zone:        derefString(ep.Zone),
			TargetName:  targetName,
			TargetKind:  targetKind,
			Ready:       derefBool(ep.Conditions.Ready),
			Serving:     derefBool(ep.Conditions.Serving),
			Terminating: derefBool(ep.Conditions.Terminating),
		})
	}

	ports := make([]dto.EndpointSlicePort, 0, len(es.Ports))
	for _, p := range es.Ports {
		protocol := ""
		if p.Protocol != nil {
			protocol = string(*p.Protocol)
		}
		ports = append(ports, dto.EndpointSlicePort{
			Name:     derefString(p.Name),
			Port:     derefInt32(p.Port),
			Protocol: protocol,
		})
	}

	managedFields := toManagedFields(es)

	lbl := es.Labels
	if lbl == nil {
		lbl = map[string]string{}
	}
	ann := es.Annotations
	if ann == nil {
		ann = map[string]string{}
	}

	controlledBy := ""
	serviceName := ""
	for _, ref := range es.OwnerReferences {
		if ref.Kind == "Service" {
			controlledBy = "Service " + ref.Name
			serviceName = ref.Name
			break
		}
	}

	return dto.EndpointSlice{
		Name:          es.Name,
		Namespace:     es.Namespace,
		AddressType:   string(es.AddressType),
		Ports:         ports,
		Endpoints:     endpoints,
		Age:           humanAge(es.CreationTimestamp.Time),
		CreatedAt:     es.CreationTimestamp.UTC().Format(time.RFC3339),
		Labels:        lbl,
		Annotations:   ann,
		ManagedFields: managedFields,
		ControlledBy:  controlledBy,
		ServiceName:   serviceName,
	}
}

func ListEndpointSlices(lister discoveryv1listers.EndpointSliceLister, namespaces []string) ([]dto.EndpointSlice, error) {
	var ess []*discoveryv1.EndpointSlice
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		ess = all
	} else {
		for _, ns := range namespaces {
			nsEss, err := lister.EndpointSlices(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListEndpointSlices: namespace %q: %v", ns, err)
				continue
			}
			ess = append(ess, nsEss...)
		}
	}
	result := make([]dto.EndpointSlice, len(ess))
	for i, es := range ess {
		result[i] = toEndpointSlice(es)
	}
	return result, nil
}

func GetEndpointSliceByName(lister discoveryv1listers.EndpointSliceLister, namespace, name string) (dto.EndpointSlice, error) {
	es, err := lister.EndpointSlices(namespace).Get(name)
	if err != nil {
		return dto.EndpointSlice{}, err
	}
	return toEndpointSlice(es), nil
}
