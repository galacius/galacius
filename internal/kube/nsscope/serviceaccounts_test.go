package nsscope

import (
	"fmt"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
)

func newServiceAccount(namespace, name string) *corev1.ServiceAccount {
	return &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace}}
}

func TestNewServiceAccountsResourceNamespaceScoped(t *testing.T) {
	objs := []runtime.Object{
		newServiceAccount("ns-a", "a1"), newServiceAccount("ns-a", "a2"),
		newServiceAccount("ns-b", "b1"),
		newServiceAccount("ns-c", "c1"), // deliberately not selected
	}
	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewServiceAccountsResource(cs, func() cache.SharedIndexInformer { return factory.Core().V1().ServiceAccounts().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope([]string{"ns-a", "ns-b"})
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing serviceaccounts: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("expected 3 serviceaccounts across ns-a/ns-b, got %d", len(all))
	}
	for _, d := range all {
		if d.Namespace == "ns-c" {
			t.Fatalf("expected no serviceaccounts from unselected namespace ns-c, got %v", d)
		}
	}
}

func TestNewServiceAccountsResourceFallsBackToClusterWideBeyondThreshold(t *testing.T) {
	var objs []runtime.Object
	var namespaces []string
	for i := range maxNamespaceScopedServiceAccountInformers + 1 {
		ns := fmt.Sprintf("ns-%d", i)
		namespaces = append(namespaces, ns)
		objs = append(objs, newServiceAccount(ns, "sa"))
	}
	objs = append(objs, newServiceAccount("ns-other", "sa"))

	cs := fake.NewSimpleClientset(objs...)
	factory := informers.NewSharedInformerFactory(cs, 0)
	r := NewServiceAccountsResource(cs, func() cache.SharedIndexInformer { return factory.Core().V1().ServiceAccounts().Informer() }, nil, nil, nil)
	defer r.Stop()

	r.Rescope(namespaces)
	<-r.SyncedChan()

	all, err := r.Lister().List(labels.Everything())
	if err != nil {
		t.Fatalf("unexpected error listing serviceaccounts: %v", err)
	}
	if len(all) != len(namespaces)+1 {
		t.Fatalf("expected cluster-wide fallback to see all %d serviceaccounts, got %d", len(namespaces)+1, len(all))
	}
}
