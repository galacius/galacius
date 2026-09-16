package kubeResources

import (
	"maps"
	"time"

	"github.com/galacius/galacius/packages/core/kube/dto"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/labels"
	listersnetworkingv1 "k8s.io/client-go/listers/networking/v1"
)

func toIngressClass(ic *networkingv1.IngressClass) dto.IngressClass {
	isDefault := false
	if ic.Annotations != nil {
		if val, ok := ic.Annotations["ingressclass.kubernetes.io/is-default-class"]; ok && val == "true" {
			isDefault = true
		}
	}

	lbls := map[string]string{}
	maps.Copy(lbls, ic.Labels)

	annots := map[string]string{}
	maps.Copy(annots, ic.Annotations)

	return dto.IngressClass{
		Name:        ic.Name,
		Controller:  ic.Spec.Controller,
		IsDefault:   isDefault,
		Age:         humanAge(ic.CreationTimestamp.Time),
		CreatedAt:   ic.CreationTimestamp.UTC().Format(time.RFC3339),
		Labels:      lbls,
		Annotations: annots,
	}
}

func ListIngressClasses(lister listersnetworkingv1.IngressClassLister) ([]dto.IngressClass, error) {
	ics, err := lister.List(labels.Everything())
	if err != nil {
		return nil, err
	}
	result := make([]dto.IngressClass, len(ics))
	for i, ic := range ics {
		result[i] = toIngressClass(ic)
	}
	return result, nil
}

func GetIngressClassByName(lister listersnetworkingv1.IngressClassLister, name string) (dto.IngressClass, error) {
	ic, err := lister.Get(name)
	if err != nil {
		return dto.IngressClass{}, err
	}
	return toIngressClass(ic), nil
}
