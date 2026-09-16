package kubeResources

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
)

//lint:ignore SA1019 legacy Endpoints API still supported alongside EndpointSlice (see ListEndpointSlices for the newer resource)
func toEndpoint(ep *corev1.Endpoints) dto.Endpoint {
	var addrs []string
	for _, subset := range ep.Subsets {
		for _, addr := range subset.Addresses {
			if len(subset.Ports) == 0 {
				addrs = append(addrs, addr.IP)
			}
			for _, port := range subset.Ports {
				addrs = append(addrs, fmt.Sprintf("%s:%d", addr.IP, port.Port))
			}
		}
	}
	endpoints := strings.Join(addrs, ", ")
	if endpoints == "" {
		endpoints = "<none>"
	}

	managedFields := toManagedFields(ep)

	subsets := make([]dto.EndpointSubset, 0, len(ep.Subsets))
	for _, subset := range ep.Subsets {
		dtoAddresses := make([]dto.EndpointAddress, 0, len(subset.Addresses))
		for _, a := range subset.Addresses {
			targetName := ""
			if a.TargetRef != nil {
				targetName = a.TargetRef.Name
			}
			dtoAddresses = append(dtoAddresses, dto.EndpointAddress{
				IP:         a.IP,
				Hostname:   a.Hostname,
				TargetName: targetName,
			})
		}
		dtoPorts := make([]dto.EndpointPort, 0, len(subset.Ports))
		for _, p := range subset.Ports {
			dtoPorts = append(dtoPorts, dto.EndpointPort{
				Name:     p.Name,
				Port:     p.Port,
				Protocol: string(p.Protocol),
			})
		}
		subsets = append(subsets, dto.EndpointSubset{
			Addresses: dtoAddresses,
			Ports:     dtoPorts,
		})
	}

	return dto.Endpoint{
		Name:          ep.Name,
		Namespace:     ep.Namespace,
		Endpoints:     endpoints,
		Age:           humanAge(ep.CreationTimestamp.Time),
		CreatedAt:     ep.CreationTimestamp.UTC().Format(time.RFC3339),
		Labels:        ep.Labels,
		Annotations:   ep.Annotations,
		ManagedFields: managedFields,
		Subsets:       subsets,
	}
}

func ListEndpoints(lister listerscorev1.EndpointsLister, namespaces []string) ([]dto.Endpoint, error) {
	//lint:ignore SA1019 legacy Endpoints API still supported alongside EndpointSlice (see ListEndpointSlices for the newer resource)
	var eps []*corev1.Endpoints
	if len(namespaces) == 0 {
		allEps, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		eps = allEps
	} else {
		for _, ns := range namespaces {
			nsEps, err := lister.Endpoints(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListEndpoints: namespace %q: %v", ns, err)
				continue
			}
			eps = append(eps, nsEps...)
		}
	}
	result := make([]dto.Endpoint, len(eps))
	for i, ep := range eps {
		result[i] = toEndpoint(ep)
	}
	return result, nil
}

func GetEndpointByName(lister listerscorev1.EndpointsLister, namespace, name string) (dto.Endpoint, error) {
	ep, err := lister.Endpoints(namespace).Get(name)
	if err != nil {
		return dto.Endpoint{}, err
	}
	return toEndpoint(ep), nil
}
