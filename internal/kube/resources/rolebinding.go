package kubeResources

import (
	"log"
	"strings"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersrbacv1 "k8s.io/client-go/listers/rbac/v1"
)

func toRoleBinding(rb *rbacv1.RoleBinding) dto.RoleBinding {
	names := make([]string, 0, len(rb.Subjects))
	seen := make(map[string]struct{})
	kinds := make([]string, 0)
	subjects := make([]dto.RBSubject, 0, len(rb.Subjects))
	for _, s := range rb.Subjects {
		names = append(names, s.Name)
		subjects = append(subjects, dto.RBSubject{Kind: s.Kind, Name: s.Name, Namespace: s.Namespace})
		if _, ok := seen[s.Kind]; !ok {
			seen[s.Kind] = struct{}{}
			kinds = append(kinds, s.Kind)
		}
	}
	bindings := strings.Join(names, ", ")
	if bindings == "" {
		bindings = "-"
	}

	managedFields := toManagedFields(rb)

	lbls := rb.Labels
	if lbls == nil {
		lbls = map[string]string{}
	}
	annotations := rb.Annotations
	if annotations == nil {
		annotations = map[string]string{}
	}

	return dto.RoleBinding{
		Name:          rb.Name,
		Namespace:     rb.Namespace,
		Bindings:      bindings,
		Age:           humanAge(rb.CreationTimestamp.Time),
		RoleRefName:   rb.RoleRef.Name,
		Types:         strings.Join(kinds, ", "),
		CreatedAt:     rb.CreationTimestamp.UTC().Format(time.RFC3339),
		Labels:        lbls,
		Annotations:   annotations,
		ManagedFields: managedFields,
		RoleRefKind:   rb.RoleRef.Kind,
		RoleRefGroup:  rb.RoleRef.APIGroup,
		Subjects:      subjects,
	}
}

func GetRoleBindingByName(lister listersrbacv1.RoleBindingLister, namespace, name string) (dto.RoleBinding, error) {
	rb, err := lister.RoleBindings(namespace).Get(name)
	if err != nil {
		return dto.RoleBinding{}, err
	}
	return toRoleBinding(rb), nil
}

func ListRoleBindings(lister listersrbacv1.RoleBindingLister, namespaces []string) ([]dto.RoleBinding, error) {
	var rbs []*rbacv1.RoleBinding
	if len(namespaces) == 0 {
		all, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		rbs = all
	} else {
		for _, ns := range namespaces {
			nsRbs, err := lister.RoleBindings(ns).List(labels.Everything())
			if err != nil {
				// Tolerate per-namespace errors (e.g., RBAC 403) but log them so
				// genuine failures (API server errors, etc.) remain visible.
				log.Printf("kubeResources: ListRoleBindings: namespace %q: %v", ns, err)
				continue
			}
			rbs = append(rbs, nsRbs...)
		}
	}
	result := make([]dto.RoleBinding, len(rbs))
	for i, rb := range rbs {
		result[i] = toRoleBinding(rb)
	}
	return result, nil
}
