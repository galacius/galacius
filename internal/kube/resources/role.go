package kubeResources

import (
	"log"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersrbacv1 "k8s.io/client-go/listers/rbac/v1"
)

func toRole(r *rbacv1.Role) dto.Role {
	managedFields := toManagedFields(r)

	lbls := r.Labels
	if lbls == nil {
		lbls = map[string]string{}
	}
	annotations := r.Annotations
	if annotations == nil {
		annotations = map[string]string{}
	}

	rules := make([]dto.PolicyRule, 0, len(r.Rules))
	for _, rule := range r.Rules {
		resources := rule.Resources
		if resources == nil {
			resources = []string{}
		}
		verbs := rule.Verbs
		if verbs == nil {
			verbs = []string{}
		}
		apiGroups := rule.APIGroups
		if apiGroups == nil {
			apiGroups = []string{}
		}
		resourceNames := rule.ResourceNames
		if resourceNames == nil {
			resourceNames = []string{}
		}
		nonResourceURLs := rule.NonResourceURLs
		if nonResourceURLs == nil {
			nonResourceURLs = []string{}
		}
		rules = append(rules, dto.PolicyRule{
			Resources:       resources,
			Verbs:           verbs,
			APIGroups:       apiGroups,
			ResourceNames:   resourceNames,
			NonResourceURLs: nonResourceURLs,
		})
	}

	return dto.Role{
		Name:          r.Name,
		Namespace:     r.Namespace,
		Age:           humanAge(r.CreationTimestamp.Time),
		CreatedAt:     r.CreationTimestamp.UTC().Format(time.RFC3339),
		Labels:        lbls,
		Annotations:   annotations,
		ManagedFields: managedFields,
		Rules:         rules,
	}
}

func GetRoleByName(lister listersrbacv1.RoleLister, namespace, name string) (dto.Role, error) {
	r, err := lister.Roles(namespace).Get(name)
	if err != nil {
		return dto.Role{}, err
	}
	return toRole(r), nil
}

func ListRoles(lister listersrbacv1.RoleLister, namespaces []string) ([]dto.Role, error) {
	var roles []*rbacv1.Role
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		roles = all
	} else {
		for _, ns := range namespaces {
			nsRoles, err := lister.Roles(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListRoles: namespace %q: %v", ns, err)
				continue
			}
			roles = append(roles, nsRoles...)
		}
	}
	result := make([]dto.Role, len(roles))
	for i, r := range roles {
		result[i] = toRole(r)
	}
	return result, nil
}
