package kubeResources

import (
	"log"
	"strings"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersnetworkingv1 "k8s.io/client-go/listers/networking/v1"
)

func toNetworkPolicy(np *networkingv1.NetworkPolicy) dto.NetworkPolicy {
	types := make([]string, len(np.Spec.PolicyTypes))
	for i, t := range np.Spec.PolicyTypes {
		types[i] = string(t)
	}
	policyTypes := strings.Join(types, ", ")
	if policyTypes == "" {
		policyTypes = "-"
	}

	return dto.NetworkPolicy{
		Name:        np.Name,
		Namespace:   np.Namespace,
		PolicyTypes: policyTypes,
		Age:         humanAge(np.CreationTimestamp.Time),
	}
}

func ListNetworkPolicies(lister listersnetworkingv1.NetworkPolicyLister, namespaces []string) ([]dto.NetworkPolicy, error) {
	var nps []*networkingv1.NetworkPolicy
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		nps = all
	} else {
		for _, ns := range namespaces {
			nsNps, err := lister.NetworkPolicies(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListNetworkPolicies: namespace %q: %v", ns, err)
				continue
			}
			nps = append(nps, nsNps...)
		}
	}
	result := make([]dto.NetworkPolicy, len(nps))
	for i, np := range nps {
		result[i] = toNetworkPolicy(np)
	}
	return result, nil
}

func GetNetworkPolicyByName(lister listersnetworkingv1.NetworkPolicyLister, namespace, name string) (*dto.NetworkPolicyDetail, error) {
	np, err := lister.NetworkPolicies(namespace).Get(name)
	if err != nil {
		return nil, err
	}

	// Extract managed fields
	managedFields := toManagedFields(np)

	// Extract pod selector
	podSelector := map[string]string{}
	if np.Spec.PodSelector.MatchLabels != nil {
		podSelector = np.Spec.PodSelector.MatchLabels
	}

	// Extract ingress rules
	ingressRules := make([]dto.NetworkPolicyIngressRule, len(np.Spec.Ingress))
	for i, rule := range np.Spec.Ingress {
		ingressRules[i] = mapIngressRule(rule)
	}

	// Extract egress rules
	egressRules := make([]dto.NetworkPolicyEgressRule, len(np.Spec.Egress))
	for i, rule := range np.Spec.Egress {
		egressRules[i] = mapEgressRule(rule)
	}

	return &dto.NetworkPolicyDetail{
		Name:          np.Name,
		Namespace:     np.Namespace,
		CreatedAt:     np.CreationTimestamp.Time.Format(time.RFC3339),
		Labels:        np.Labels,
		Annotations:   np.Annotations,
		ManagedFields: managedFields,
		PodSelector:   podSelector,
		IngressRules:  ingressRules,
		EgressRules:   egressRules,
	}, nil
}

func mapIngressRule(rule networkingv1.NetworkPolicyIngressRule) dto.NetworkPolicyIngressRule {
	ports := make([]string, len(rule.Ports))
	for i, port := range rule.Ports {
		protocol := string(*port.Protocol) // pointer deref
		portNum := ""
		if port.Port != nil {
			portNum = port.Port.String()
		} else {
			portNum = "*"
		}
		ports[i] = protocol + ":" + portNum
	}

	from := make([]dto.NetworkPolicyPeer, 0)
	for _, peer := range rule.From {
		from = append(from, mapNetworkPolicyPeer(peer))
	}

	return dto.NetworkPolicyIngressRule{
		Ports: ports,
		From:  from,
	}
}

func mapEgressRule(rule networkingv1.NetworkPolicyEgressRule) dto.NetworkPolicyEgressRule {
	ports := make([]string, len(rule.Ports))
	for i, port := range rule.Ports {
		protocol := string(*port.Protocol)
		portNum := ""
		if port.Port != nil {
			portNum = port.Port.String()
		} else {
			portNum = "*"
		}
		ports[i] = protocol + ":" + portNum
	}

	to := make([]dto.NetworkPolicyPeer, 0)
	for _, peer := range rule.To {
		to = append(to, mapNetworkPolicyPeer(peer))
	}

	return dto.NetworkPolicyEgressRule{
		Ports: ports,
		To:    to,
	}
}

func mapNetworkPolicyPeer(peer networkingv1.NetworkPolicyPeer) dto.NetworkPolicyPeer {
	podSelector := map[string]string{}
	if peer.PodSelector != nil && peer.PodSelector.MatchLabels != nil {
		podSelector = peer.PodSelector.MatchLabels
	}

	nsSelector := map[string]string{}
	if peer.NamespaceSelector != nil && peer.NamespaceSelector.MatchLabels != nil {
		nsSelector = peer.NamespaceSelector.MatchLabels
	}

	ipBlock := ""
	if peer.IPBlock != nil {
		ipBlock = peer.IPBlock.CIDR
	}

	return dto.NetworkPolicyPeer{
		PodSelector:       podSelector,
		NamespaceSelector: nsSelector,
		IPBlock:           ipBlock,
	}
}
