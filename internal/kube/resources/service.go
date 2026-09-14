package kubeResources

import (
	"fmt"
	"log"
	"maps"
	"strings"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/labels"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
)

func toService(svc *corev1.Service) dto.Service {
	externalIP := "-"
	if ingresses := svc.Status.LoadBalancer.Ingress; len(ingresses) > 0 {
		if ingresses[0].Hostname != "" {
			externalIP = ingresses[0].Hostname
		} else {
			externalIP = ingresses[0].IP
		}
	}

	portParts := make([]string, 0, len(svc.Spec.Ports))
	for _, p := range svc.Spec.Ports {
		targetStr := p.TargetPort.String()
		portStr := fmt.Sprintf("%d", p.Port)
		if targetStr != "" && targetStr != portStr {
			portParts = append(portParts, fmt.Sprintf("%d:%s/%s", p.Port, targetStr, p.Protocol))
		} else {
			portParts = append(portParts, fmt.Sprintf("%d/%s", p.Port, p.Protocol))
		}
	}

	selector := make(map[string]string, len(svc.Spec.Selector))
	maps.Copy(selector, svc.Spec.Selector)

	status := "Active"
	if svc.DeletionTimestamp != nil {
		status = "Terminating"
	}

	labels := make(map[string]string, len(svc.Labels))
	maps.Copy(labels, svc.Labels)
	annotations := make(map[string]string, len(svc.Annotations))
	maps.Copy(annotations, svc.Annotations)

	managedFields := toManagedFields(svc)

	sessionAffinity := string(svc.Spec.SessionAffinity)
	if sessionAffinity == "" {
		sessionAffinity = "None"
	}

	internalTrafficPolicy := "Cluster"
	if svc.Spec.InternalTrafficPolicy != nil {
		internalTrafficPolicy = string(*svc.Spec.InternalTrafficPolicy)
	}

	clusterIPs := make([]string, len(svc.Spec.ClusterIPs))
	copy(clusterIPs, svc.Spec.ClusterIPs)

	ipFamilyPolicy := ""
	if svc.Spec.IPFamilyPolicy != nil {
		ipFamilyPolicy = string(*svc.Spec.IPFamilyPolicy)
	}

	ipFamilies := make([]string, len(svc.Spec.IPFamilies))
	for i, f := range svc.Spec.IPFamilies {
		ipFamilies[i] = string(f)
	}

	servicePorts := make([]dto.ServicePort, len(svc.Spec.Ports))
	for i, p := range svc.Spec.Ports {
		servicePorts[i] = dto.ServicePort{
			Name:       p.Name,
			Port:       p.Port,
			TargetPort: p.TargetPort.String(),
			Protocol:   string(p.Protocol),
			NodePort:   p.NodePort,
		}
	}

	return dto.Service{
		Name:       svc.Name,
		Namespace:  svc.Namespace,
		Type:       string(svc.Spec.Type),
		ClusterIP:  svc.Spec.ClusterIP,
		Ports:      strings.Join(portParts, ", "),
		ExternalIP: externalIP,
		Selector:   selector,
		Age:        humanAge(svc.CreationTimestamp.Time),
		Status:     status,

		CreatedAt:             svc.CreationTimestamp.UTC().Format(time.RFC3339),
		Labels:                labels,
		Annotations:           annotations,
		ManagedFields:         managedFields,
		SessionAffinity:       sessionAffinity,
		InternalTrafficPolicy: internalTrafficPolicy,
		ClusterIPs:            clusterIPs,
		IPFamilyPolicy:        ipFamilyPolicy,
		IPFamilies:            ipFamilies,
		ServicePorts:          servicePorts,
	}
}

func GetServiceByName(lister listerscorev1.ServiceLister, namespace, name string) (dto.Service, error) {
	svc, err := lister.Services(namespace).Get(name)
	if err != nil {
		return dto.Service{}, err
	}
	return toService(svc), nil
}

func ListServices(lister listerscorev1.ServiceLister, namespaces []string) ([]dto.Service, error) {
	var svcs []*corev1.Service
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		svcs = all
	} else {
		for _, ns := range namespaces {
			nsSvcs, err := lister.Services(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListServices: namespace %q: %v", ns, err)
				continue
			}
			svcs = append(svcs, nsSvcs...)
		}
	}
	result := make([]dto.Service, len(svcs))
	for i, s := range svcs {
		result[i] = toService(s)
	}
	return result, nil
}
